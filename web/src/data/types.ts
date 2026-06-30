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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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

export type KnowledgeEntityType =
  | 'material'
  | 'experiment'
  | 'property'
  | 'regime'
  | 'equipment'
  | 'document'
  | 'team'
  | 'conclusion';

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
  properties: Array<{
    label: string;
    value: string;
  }>;
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

export type ExperimentStatus =
  | 'verified'
  | 'needs_review'
  | 'conflict';

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
  status: ExperimentStatus;
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

export type DocumentStatus = 'indexed' | 'processing' | 'needs_review';

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
  entityType: 'material' | 'experiment' | 'document';
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
