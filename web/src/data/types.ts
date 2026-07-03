export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: 'documents' | 'experiments' | 'materials' | 'relations';
}

export interface HomePageData {
  stats: DashboardStat[];
  exampleQueries: string[];
}

export interface SearchKnowledgeResponse {
  query: string;
  experimentsFound: number;
  documentsFound: number;
}

export type MentionableEntityType =
  | 'material'
  | 'experiment'
  | 'document'
  | 'data_issue'
  | 'property'
  | 'regime'
  | 'equipment'
  | 'team'
  | 'conclusion'
  | 'process'
  | 'publication'
  | 'expert'
  | 'facility'
  | 'technology'
  | 'geography'
  | 'economic_indicator'
  | 'unclassified';

export interface EntityAttribute {
  name: string;
  value: string | number | boolean;
  unit?: string;
  operator?: '<' | '<=' | '=' | '>=' | '>' | 'BETWEEN';
  numericValue?: number;
  minValue?: number;
  maxValue?: number;
  normalizedUnit?: string;
}

export interface SourceReference {
  documentId: string;
  page?: number;
  chunkId?: string;
  section?: string;
  quote?: string;
}

export interface MentionableEntity {
  id: string;
  type: MentionableEntityType;
  label: string;
  subtitle: string;
}

export interface EntityMention {
  id: string;
  type: MentionableEntityType;
  label: string;
}

export interface ChatCitation {
  id: string;
  entityId: string;
  entityType: MentionableEntityType;
  label: string;
  description: string;
  page?: number;
  relatedEntities?: Array<{
    id: string;
    type: MentionableEntityType;
    label: string;
    description: string;
  }>;
}

export interface ChatEvidenceContext {
  chunkId: string;
  text: string;
  documentId: string;
  documentTitle: string;
  page?: number;
  section?: string;
  score?: number;
  entityIds: string[];
  graphPaths: ChatEvidencePath[];
  source: string;
}

export interface ChatEvidenceEntity {
  id: string;
  type: MentionableEntityType;
  label: string;
  description: string;
  confidence?: number;
  verificationStatus?: string;
  geography?: string;
  publicationYear?: number;
}

export interface ChatEvidencePath {
  sourceId: string;
  sourceLabel?: string;
  sourceType?: MentionableEntityType;
  relationship: string;
  targetId: string;
  targetLabel?: string;
  targetType?: MentionableEntityType;
}

export interface ChatEvidence {
  originalQuery?: string;
  retrievalQuery?: string;
  transformation?:
    | 'none'
    | 'compression'
    | 'rewrite'
    | 'compression_rejected'
    | 'rewrite_rejected';
  graphDepth?: number;
  filters?: {
    entityTypes: MentionableEntityType[];
    countries: string[];
    geographyScope?: 'domestic' | 'foreign' | 'comparison';
    yearFrom?: number;
    yearTo?: number;
    numericConditions: Array<{
      parameter: string;
      operator: string;
      value?: number;
      minValue?: number;
      maxValue?: number;
      unit?: string;
    }>;
  };
  responseMode?: 'default' | 'literature_review' | 'comparison';
  systemPrompt: string;
  userPrompt: string;
  contexts: ChatEvidenceContext[];
  entities: ChatEvidenceEntity[];
  paths: ChatEvidencePath[];
  recommendations: Array<{
    id: string;
    type: MentionableEntityType;
    label: string;
    reason: string;
  }>;
}

export type ChatProcessingStage =
  | 'request_received'
  | 'classifying_query'
  | 'query_classified'
  | 'compressing_query'
  | 'rewriting_query'
  | 'validating_query'
  | 'transformation_rejected'
  | 'query_ready'
  | 'retrieving_knowledge'
  | 'knowledge_retrieved'
  | 'generating_response'
  | 'response_completed'
  | 'failed'
  | 'interrupted';

export interface ChatStatusEvent {
  stage: ChatProcessingStage;
  timestamp: string;
  message?: string;
}

export type ChatResearchStatus =
  | 'preparing'
  | 'retrieving'
  | 'retrieved'
  | 'generating';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mentions?: EntityMention[];
  citations?: ChatCitation[];
  status: 'streaming' | 'completed' | 'failed' | 'interrupted';
  requestId?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  generationDurationMs?: number;
  evidence?: ChatEvidence;
  statusHistory?: ChatStatusEvent[];
  researchStatus?: ChatResearchStatus;
  error?: string;
  createdAt?: string;
}

export type ChatHistoryGroup = 'today' | 'yesterday' | 'earlier';

export interface ChatSummary {
  id: string;
  title: string;
  group: ChatHistoryGroup;
  date: string;
}

export interface ResearchChat extends ChatSummary {
  messages: ChatMessage[];
}

export interface AskAssistantResponse {
  message: ChatMessage;
  sourcesFound: number;
  experimentsFound: number;
}

export interface AskAssistantRequest {
  chatId?: string;
  requestId: string;
  text: string;
  mentions: EntityMention[];
}

export interface ChatStreamHandlers {
  onStarted?: (message: ChatMessage) => void;
  onStatus?: (status: ChatResearchStatus) => void;
  onEvidence?: (evidence: ChatEvidence) => void;
  onStatusEvent?: (event: ChatStatusEvent) => void;
  onDelta: (delta: string) => void;
  onCitations?: (citations: ChatCitation[]) => void;
}

export type KnowledgeEntityType = MentionableEntityType;

export interface KnowledgeGraphEntity {
  id: string;
  type: KnowledgeEntityType;
  title: string;
  subtitle: string;
  description: string;
  position: {
    x: number;
    y: number;
  };
  attributes: EntityAttribute[];
  sources: SourceReference[];
  confidence: number;
  verificationStatus: string;
  geography?: string;
  publicationYear?: number;
  language?: string;
  version: number;
  updatedAt: string;
}

export interface KnowledgeGraphConnection {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraphData {
  entities: KnowledgeGraphEntity[];
  connections: KnowledgeGraphConnection[];
}

export interface KnowledgeFact {
  id: string;
  name: string;
  operator?: string;
  numericValue?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  normalizedUnit?: string;
  textValue?: string;
  sourceDocumentId?: string;
  sourcePage?: number;
  confidence: number;
}

export interface KnowledgeEntityVersion {
  id: string;
  version: number;
  changeType: string;
  changeMessage?: string;
  snapshotJson: string;
  changedAt: string;
}

export interface UpdateKnowledgeEntityRequest {
  type: KnowledgeEntityType;
  title: string;
  description: string;
  attributes: EntityAttribute[];
  confidence: number;
  verificationStatus: string;
  geography?: string;
  publicationYear?: number;
  language?: string;
  changeMessage?: string;
}

export interface ExperimentRecord {
  id: string;
  title: string;
  materialId: string;
  material: string;
  materialDetails: string;
  temperature: number | null;
  duration: string;
  coolingMethod: string;
  property: string;
  valueBefore: string;
  valueAfter: string;
  effect: string;
  equipmentId: string | null;
  equipment: string;
  teamId: string;
  team: string;
  date: string;
  sourceDocumentId: string;
  sourceName: string;
  sourcePage: number | null;
  confidence: number;
  notes: string;
}

export interface MaterialCompositionItem {
  element: string;
  percentage: string;
}

export interface MaterialRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  aliases: string[];
  composition: MaterialCompositionItem[];
  keyProperties: Array<{
    label: string;
    value: string;
  }>;
  experimentIds: string[];
  documentIds: string[];
  issueIds: string[];
}

export type DocumentStatus = 'ready' | 'processing' | 'canceled' | 'error';

export interface DocumentRecord {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'csv';
  year: number;
  author: string;
  description: string;
  pages: number | null;
  status: DocumentStatus;
  indexedAt: string;
  extractedEntities: number;
  downloadAvailable: boolean;
  experimentIds: string[];
  materialIds: string[];
  issueIds: string[];
}

export type DataIssueType =
  | 'missing_data'
  | 'conflict'
  | 'unit_mismatch'
  | 'unexplored_range'
  | 'weak_evidence'
  | 'geography_gap'
  | 'unvalidated_technology'
  | 'stale_knowledge';

export type DataIssueSeverity = 'high' | 'medium' | 'low';

export interface RelatedEntityLink {
  id: string;
  label: string;
  entityType: MentionableEntityType;
}

export interface DataIssueRecord {
  id: string;
  type: DataIssueType;
  severity: DataIssueSeverity;
  title: string;
  description: string;
  recommendation: string;
  detectedAt: string;
  relatedEntities: RelatedEntityLink[];
}

export interface ExtractedEntity {
  id: string;
  type: KnowledgeEntityType;
  name: string;
  attributes: EntityAttribute[];
  source: SourceReference;
  confidence?: number;
  verificationStatus?: string;
  geography?: string;
  year?: number;
  language?: string;
}

export interface ExtractedRelation {
  id: string;
  sourceId: string;
  type: string;
  targetId: string;
  source: SourceReference;
}

export interface DocumentExtractionResult {
  documentId: string;
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  warnings: string[];
}

export interface UploadDocumentResponse {
  document: DocumentRecord;
  extraction: DocumentExtractionResult;
  jobId: string;
}

export interface PublishExtractionResponse {
  documentId: string;
  publishedEntityIds: string[];
  publishedRelationIds: string[];
  jobId: string;
}

export interface PublishExtractionRequest {
  documentId: string;
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

export type IngestionJobStatus =
  | 'queued'
  | 'running'
  | 'ready_for_review'
  | 'published'
  | 'canceled'
  | 'failed';

export type IngestionJobType = 'document_processing' | 'document_publish';

export interface IngestionJob {
  id: string;
  documentId: string;
  type: IngestionJobType;
  status: IngestionJobStatus;
  progress: number;
  stage: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
