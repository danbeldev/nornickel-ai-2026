import {
  AskAssistantRequest,
  AskAssistantResponse,
  ChatStreamHandlers,
  ChatSummary,
  DataIssueRecord,
  DocumentRecord,
  DocumentExtractionResult,
  ExperimentRecord,
  HomePageData,
  IngestionJob,
  IngestionJobStatus,
  KnowledgeGraphData,
  KnowledgeGraphEntity,
  KnowledgeFact,
  KnowledgeEntityVersion,
  UpdateKnowledgeEntityRequest,
  MaterialRecord,
  MentionableEntity,
  MentionableEntityPage,
  PublishExtractionRequest,
  PublishExtractionResponse,
  ResearchChat,
  SearchKnowledgeResponse,
  UploadDocumentResponse,
} from './types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const api = {
  async getHomePageData(): Promise<HomePageData> {
    return request<HomePageData>('/home');
  },

  async searchKnowledge(query: string): Promise<SearchKnowledgeResponse> {
    return request<SearchKnowledgeResponse>(
      `/search?query=${encodeURIComponent(query)}`,
    );
  },

  async askResearchAssistant(
    payload: AskAssistantRequest,
  ): Promise<AskAssistantResponse> {
    if (!payload.chatId) {
      throw new Error('Для отправки сообщения сначала нужно создать чат');
    }

    return request<AskAssistantResponse>(
      `/chats/${encodeURIComponent(payload.chatId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async streamResearchAssistant(
    payload: AskAssistantRequest,
    handlers: ChatStreamHandlers,
    signal?: AbortSignal,
  ): Promise<AskAssistantResponse | null> {
    if (!payload.chatId) {
      throw new Error('Для потокового ответа требуется идентификатор чата');
    }

    const response = await fetch(
      `${API_BASE_URL}/chats/${encodeURIComponent(payload.chatId)}/messages/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      },
    );

    if (!response.ok || !response.body) {
      throw new Error(`API stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed: AskAssistantResponse | null = null;
    let streamError: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
        if (payload.type === 'message_started' && payload.message) {
          handlers.onStarted?.(payload.message);
        }
        if (payload.type === 'status_changed' && payload.statusEvent) {
          handlers.onStatusEvent?.(payload.statusEvent);
        }
        if (payload.type === 'retrieval_started') {
          handlers.onStatus?.('retrieving');
        }
        if (payload.type === 'retrieval_completed' && payload.evidence) {
          handlers.onEvidence?.(payload.evidence);
          handlers.onStatus?.('retrieved');
        }
        if (payload.type === 'generation_started') {
          if (payload.evidence) {
            handlers.onEvidence?.(payload.evidence);
          }
          handlers.onStatus?.('generating');
        }
        if (payload.type === 'content_delta' && payload.delta) {
          handlers.onDelta(payload.delta);
        }
        if (payload.type === 'citations' && payload.citations) {
          handlers.onCitations?.(payload.citations);
        }
        if (payload.type === 'message_completed' && payload.message) {
          completed = {
            message: payload.message,
            sourcesFound: payload.message.citations?.length ?? 0,
            experimentsFound:
              payload.message.citations?.filter(
                (citation: { entityType: string }) =>
                  citation.entityType === 'experiment',
              ).length ?? 0,
          };
        }
        if (payload.type === 'error') {
          streamError = payload.error ?? 'Не удалось получить ответ';
        }
      }
    }

    if (streamError) {
      throw new Error(streamError);
    }

    return completed;
  },

  async cancelResearchAssistant(
    chatId: string,
    requestId: string,
  ): Promise<{ canceled: boolean }> {
    return request<{ canceled: boolean }>(
      `/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
        requestId,
      )}/cancel`,
      { method: 'POST' },
    );
  },

  async getChats(): Promise<ChatSummary[]> {
    return request<ChatSummary[]>('/chats');
  },

  async getRecentChats(limit = 5): Promise<ChatSummary[]> {
    return request<ChatSummary[]>(`/chats/recent?limit=${limit}`);
  },

  async getChat(chatId: string): Promise<ResearchChat | null> {
    try {
      return await request<ResearchChat>(`/chats/${encodeURIComponent(chatId)}`);
    } catch {
      return null;
    }
  },

  async createChat(payload: AskAssistantRequest): Promise<ResearchChat> {
    return request<ResearchChat>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        text: payload.text,
        mentions: payload.mentions,
      }),
    });
  },

  async getKnowledgeGraph(): Promise<KnowledgeGraphData> {
    return request<KnowledgeGraphData>('/knowledge-graph');
  },

  async getKnowledgeGraphPreview(): Promise<KnowledgeGraphData> {
    return request<KnowledgeGraphData>('/knowledge-graph/preview');
  },

  async getKnowledgeEntity(entityId: string): Promise<KnowledgeGraphEntity> {
    return request<KnowledgeGraphEntity>(
      `/knowledge-graph/entities/${encodeURIComponent(entityId)}`,
    );
  },

  async getKnowledgeFacts(entityId: string): Promise<KnowledgeFact[]> {
    return request<KnowledgeFact[]>(
      `/knowledge-graph/entities/${encodeURIComponent(entityId)}/facts`,
    );
  },

  async getKnowledgeEntityVersions(
    entityId: string,
  ): Promise<KnowledgeEntityVersion[]> {
    return request<KnowledgeEntityVersion[]>(
      `/knowledge-graph/entities/${encodeURIComponent(entityId)}/versions`,
    );
  },

  async updateKnowledgeEntity(
    entityId: string,
    payload: UpdateKnowledgeEntityRequest,
  ): Promise<KnowledgeGraphEntity> {
    return request<KnowledgeGraphEntity>(
      `/knowledge-graph/entities/${encodeURIComponent(entityId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async mergeKnowledgeEntity(
    sourceEntityId: string,
    targetEntityId: string,
    changeMessage?: string,
  ): Promise<KnowledgeGraphEntity> {
    return request<KnowledgeGraphEntity>(
      `/knowledge-graph/entities/${encodeURIComponent(sourceEntityId)}/merge`,
      {
        method: 'POST',
        body: JSON.stringify({ targetEntityId, changeMessage }),
      },
    );
  },

  async updateKnowledgeConnection(
    connectionId: string,
    relationType: string,
    changeMessage?: string,
  ) {
    return request(
      `/knowledge-graph/connections/${encodeURIComponent(connectionId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ relationType, changeMessage }),
      },
    );
  },

  async createKnowledgeConnection(
    sourceId: string,
    targetId: string,
    relationType: string,
    changeMessage?: string,
  ) {
    return request('/knowledge-graph/connections', {
      method: 'POST',
      body: JSON.stringify({
        sourceId,
        targetId,
        relationType,
        changeMessage,
      }),
    });
  },

  async deleteKnowledgeConnection(
    connectionId: string,
    changeMessage?: string,
  ): Promise<void> {
    const suffix = changeMessage
      ? `?changeMessage=${encodeURIComponent(changeMessage)}`
      : '';
    const response = await fetch(
      `${API_BASE_URL}/knowledge-graph/connections/${encodeURIComponent(
        connectionId,
      )}${suffix}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      throw new Error('Не удалось удалить связь');
    }
  },

  async getExperiments(): Promise<ExperimentRecord[]> {
    return request<ExperimentRecord[]>('/experiments');
  },

  async getExperiment(experimentId: string): Promise<ExperimentRecord | null> {
    try {
      return await request<ExperimentRecord>(
        `/experiments/${encodeURIComponent(experimentId)}`,
      );
    } catch {
      return null;
    }
  },

  async getMaterials(): Promise<MaterialRecord[]> {
    return request<MaterialRecord[]>('/materials');
  },

  async getMaterial(materialId: string): Promise<MaterialRecord | null> {
    try {
      return await request<MaterialRecord>(
        `/materials/${encodeURIComponent(materialId)}`,
      );
    } catch {
      return null;
    }
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    return request<DocumentRecord[]>('/documents');
  },

  async getRecentDocuments(limit = 5): Promise<DocumentRecord[]> {
    return request<DocumentRecord[]>(`/documents/recent?limit=${limit}`);
  },

  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    try {
      return await request<DocumentRecord>(
        `/documents/${encodeURIComponent(documentId)}`,
      );
    } catch {
      return null;
    }
  },

  getDocumentDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download`;
  },

  getDocumentVisualUrl(documentId: string, visualId: string): string {
    return `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/visuals/${encodeURIComponent(visualId)}`;
  },

  async getDocumentExtraction(
    documentId: string,
  ): Promise<DocumentExtractionResult> {
    return request<DocumentExtractionResult>(
      `/documents/${encodeURIComponent(documentId)}/extraction`,
    );
  },

  async getDataIssues(): Promise<DataIssueRecord[]> {
    return request<DataIssueRecord[]>('/data-issues');
  },

  async getRecentDataIssues(limit = 5): Promise<DataIssueRecord[]> {
    return request<DataIssueRecord[]>(`/data-issues/recent?limit=${limit}`);
  },

  async searchMentionableEntities(
    query: string,
    page = 0,
    size = 6,
  ): Promise<MentionableEntityPage> {
    return request<MentionableEntityPage>(
      `/entities/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`,
    );
  },

  async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    const body = new FormData();
    body.append('file', file);

    return request<UploadDocumentResponse>('/documents/enqueue', {
      method: 'POST',
      body,
    });
  },

  async importDocumentUrl(url: string): Promise<UploadDocumentResponse> {
    return request<UploadDocumentResponse>('/documents/enqueue-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async getIngestionJob(
    jobId: string,
    signal?: AbortSignal,
  ): Promise<IngestionJob> {
    return request<IngestionJob>(`/jobs/${encodeURIComponent(jobId)}`, {
      signal,
    });
  },

  async getDocumentJobs(documentId: string): Promise<IngestionJob[]> {
    return request<IngestionJob[]>(
      `/documents/${encodeURIComponent(documentId)}/jobs`,
    );
  },

  async cancelIngestionJob(jobId: string): Promise<IngestionJob> {
    return request<IngestionJob>(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
  },

  async waitForIngestionJob(
    jobId: string,
    successStatuses: IngestionJobStatus[],
    signal?: AbortSignal,
    onUpdate?: (job: IngestionJob) => void,
  ): Promise<IngestionJob> {
    const timeoutAt = Date.now() + 30 * 60 * 1000;

    while (Date.now() < timeoutAt) {
      const job = await request<IngestionJob>(
        `/jobs/${encodeURIComponent(jobId)}`,
        { signal },
      );
      onUpdate?.(job);

      if (successStatuses.includes(job.status)) {
        return job;
      }
      if (job.status === 'failed') {
        throw new Error(job.errorMessage || 'Фоновая обработка документа завершилась ошибкой');
      }
      if (job.status === 'canceled') {
        throw new Error('Обработка документа отменена');
      }

      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Операция отменена', 'AbortError'));
        };
        const timeout = window.setTimeout(() => {
          signal?.removeEventListener('abort', abort);
          resolve();
        }, 1500);
        signal?.addEventListener('abort', abort, { once: true });
      });
    }

    throw new Error('Превышено время ожидания фоновой обработки документа');
  },

  async publishDocumentExtraction(
    payload: PublishExtractionRequest,
  ): Promise<PublishExtractionResponse> {
    return request<PublishExtractionResponse>(
      `/documents/${encodeURIComponent(payload.documentId)}/publish`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};

export default api;
