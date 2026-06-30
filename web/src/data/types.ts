export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: 'documents' | 'experiments' | 'materials' | 'relations';
}

export interface RecentChat {
  id: string;
  title: string;
  date: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  documents: number;
  status: 'indexed' | 'indexing';
}

export interface HomePageData {
  stats: DashboardStat[];
  exampleQueries: string[];
  recentChats: RecentChat[];
  sources: DataSource[];
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
  | 'unclassified';

export interface EntityAttribute {
  name: string;
  value: string | number | boolean;
  unit?: string;
}

export interface SourceReference {
  documentId: string;
  page?: number;
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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mentions?: EntityMention[];
  citations?: ChatCitation[];
}

export type ChatHistoryGroup = 'today' | 'yesterday' | 'earlier';

export interface ChatSummary {
  id: string;
  title: string;
  group: ChatHistoryGroup;
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
  text: string;
  mentions: EntityMention[];
}

export type KnowledgeEntityType = Exclude<
  MentionableEntityType,
  'data_issue'
>;

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

export interface ExperimentRecord {
  id: string;
  title: string;
  materialId: string;
  material: string;
  materialDetails: string;
  temperature: number;
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
  sourcePage: number;
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

export type DocumentStatus = 'ready' | 'processing' | 'error';

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
  experimentIds: string[];
  materialIds: string[];
  issueIds: string[];
}

export type DataIssueType =
  | 'missing_data'
  | 'conflict'
  | 'unit_mismatch'
  | 'unexplored_range';

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
}

export interface PublishExtractionResponse {
  documentId: string;
  publishedEntityIds: string[];
  publishedRelationIds: string[];
}

export interface PublishExtractionRequest {
  documentId: string;
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}
