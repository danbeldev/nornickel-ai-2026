import {
  AskAssistantRequest,
  AskAssistantResponse,
  ChatSummary,
  DataIssueRecord,
  DocumentRecord,
  DocumentExtractionResult,
  ExperimentRecord,
  HomePageData,
  KnowledgeGraphData,
  MaterialRecord,
  MentionableEntity,
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
      const chat = await api.createChat(payload);
      const message = chat.messages[chat.messages.length - 1];

      return {
        message,
        sourcesFound: message.citations?.length ?? 0,
        experimentsFound:
          message.citations?.filter(
            (citation) => citation.entityType === 'experiment',
          ).length ?? 0,
      };
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
    onDelta: (delta: string) => void,
  ): Promise<AskAssistantResponse | null> {
    if (!payload.chatId) {
      return api.askResearchAssistant(payload);
    }

    const response = await fetch(
      `${API_BASE_URL}/chats/${encodeURIComponent(payload.chatId)}/messages/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok || !response.body) {
      throw new Error(`API stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed: AskAssistantResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
        if (payload.type === 'content_delta' && payload.delta) {
          onDelta(payload.delta);
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
      }
    }

    return completed;
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
      body: JSON.stringify(payload),
    });
  },

  async getKnowledgeGraph(): Promise<KnowledgeGraphData> {
    return request<KnowledgeGraphData>('/knowledge-graph');
  },

  async getKnowledgeGraphPreview(): Promise<KnowledgeGraphData> {
    return request<KnowledgeGraphData>('/knowledge-graph/preview');
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
  ): Promise<MentionableEntity[]> {
    return request<MentionableEntity[]>(
      `/entities/search?query=${encodeURIComponent(query)}&limit=10`,
    );
  },

  async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    const body = new FormData();
    body.append('file', file);

    return request<UploadDocumentResponse>('/documents', {
      method: 'POST',
      body,
    });
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
