export type MemoryType = 'decision' | 'incident' | 'pr' | 'project' | 'system' | 'person';
export type SourceType = 'slack' | 'github' | 'docs';
export type EntityType = 'person' | 'team' | 'system' | 'project' | 'repo' | 'service';
export type RelationType = 'related_to' | 'supersedes' | 'caused_by' | 'affects' | 'decided_by';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  summary: string;
  content: string | null;
  source_type: SourceType;
  source_id: string;
  source_url: string | null;
  timestamp: Date;
  confidence: number;
  extracted_at: Date;
  valid_from: Date;
  valid_to: Date | null;
  metadata: Record<string, unknown>;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface MemoryEntity {
  id: string;
  memory_id: string;
  entity_id: string;
  role: string;
}

export interface MemoryRelation {
  id: string;
  from_memory_id: string;
  to_memory_id: string;
  relation_type: RelationType;
}

export interface MemoryEmbedding {
  id: string;
  memory_id: string;
  embedding: number[];
  created_at: Date;
}

export interface ExtractedMemory {
  type: MemoryType;
  summary: string;
  entities: ExtractedEntity[];
  reason?: string;
  outcome?: string;
  confidence: number;
}

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  role?: string;
}

export interface SlackMessage {
  channel: string;
  ts: string;
  text: string;
  user: string;
  thread_ts?: string;
}

export interface GitHubEvent {
  type: string;
  repo: string;
  action?: string;
  number?: number;
  title?: string;
  body?: string;
  user: string;
  created_at: string;
  sha?: string;
}

export interface QueryResult {
  memory: MemoryItem;
  score: number;
  entities: Entity[];
  sources: { type: SourceType; url: string }[];
}

export interface AskResponse {
  answer: string;
  memories: QueryResult[];
  confidence: number;
}
