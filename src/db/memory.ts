import { query, queryOne, execute } from '../db/connection.js';
import { MemoryItem, Entity, ExtractedMemory, SourceType, MemoryType, QueryResult } from '../types/index.js';
import { generateEmbedding } from '../extraction/gemini.js';

export async function memoryExists(
  sourceType: SourceType,
  sourceId: string
): Promise<boolean> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM memory_items WHERE source_type = $1 AND source_id = $2',
    [sourceType, sourceId]
  );
  return !!existing;
}

export async function createMemory(
  type: MemoryType,
  summary: string,
  sourceType: SourceType,
  sourceId: string,
  content: string,
  timestamp: Date,
  confidence: number,
  sourceUrl?: string,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  try {
    // Check if already exists (deduplication)
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM memory_items WHERE source_type = $1 AND source_id = $2',
      [sourceType, sourceId]
    );
    
    if (existing) {
      console.log(`Memory already exists for ${sourceType}:${sourceId}, skipping`);
      return existing.id;
    }
    
    const result = await queryOne<{ id: string }>(
      `INSERT INTO memory_items (type, summary, content, source_type, source_id, source_url, timestamp, confidence, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [type, summary, content, sourceType, sourceId, sourceUrl || null, timestamp, confidence, metadata]
    );
    return result?.id || null;
  } catch (error) {
    console.error('Create memory error:', error);
    return null;
  }
}

export async function getMemoryById(id: string): Promise<MemoryItem | null> {
  return queryOne<MemoryItem>('SELECT * FROM memory_items WHERE id = $1', [id]);
}

export async function createEntity(
  name: string,
  type: Entity['type'],
  description?: string
): Promise<string | null> {
  try {
    const result = await queryOne<{ id: string }>(
      `INSERT INTO entities (name, type, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, type, description || null]
    );
    return result?.id || null;
  } catch (error) {
    console.error('Create entity error:', error);
    return null;
  }
}

export async function linkMemoryToEntity(
  memoryId: string,
  entityId: string,
  role: string = 'mentioned'
): Promise<boolean> {
  try {
    await execute(
      `INSERT INTO memory_entities (memory_id, entity_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [memoryId, entityId, role]
    );
    return true;
  } catch (error) {
    console.error('Link memory-entity error:', error);
    return false;
  }
}

export async function createMemoryEmbedding(
  memoryId: string,
  text: string
): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(text);
    await execute(
      `INSERT INTO memory_embeddings (memory_id, embedding)
       VALUES ($1, $2)
       ON CONFLICT (memory_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
      [memoryId, JSON.stringify(embedding)]
    );
    return true;
  } catch (error) {
    console.error('Create embedding error:', error);
    return false;
  }
}

export async function searchMemories(
  searchText: string,
  limit: number = 10
): Promise<QueryResult[]> {
  try {
    const embedding = await generateEmbedding(searchText);
    const embeddingStr = JSON.stringify(embedding);
    
    const results = await query<{
      id: string;
      type: string;
      summary: string;
      content: string | null;
      source_type: string;
      source_id: string;
      source_url: string | null;
      timestamp: Date;
      confidence: number;
      score: number;
    }>(
      `SELECT m.*, 
              (1 - (e.embedding <=> $1::vector)) as score
       FROM memory_items m
       LEFT JOIN memory_embeddings e ON m.id = e.memory_id
       WHERE e.embedding IS NOT NULL
       ORDER BY e.embedding <=> $1::vector
       LIMIT $2`,
      [embeddingStr, limit]
    );

    return results.map((row) => ({
      memory: {
        id: row.id,
        type: row.type as MemoryType,
        summary: row.summary,
        content: row.content,
        source_type: row.source_type as SourceType,
        source_id: row.source_id,
        source_url: row.source_url,
        timestamp: row.timestamp,
        confidence: row.confidence,
        extracted_at: row.timestamp,
        valid_from: row.timestamp,
        valid_to: null,
        metadata: {},
      },
      score: row.score,
      entities: [],
      sources: row.source_url ? [{ type: row.source_type as SourceType, url: row.source_url }] : [],
    }));
  } catch (error) {
    console.error('Search memories error:', error);
    return [];
  }
}

export async function getMemoriesByType(
  type: MemoryType,
  limit: number = 50
): Promise<MemoryItem[]> {
  return query<MemoryItem>(
    'SELECT * FROM memory_items WHERE type = $1 ORDER BY timestamp DESC LIMIT $2',
    [type, limit]
  );
}

export async function getMemoriesByEntity(
  entityName: string,
  limit: number = 20
): Promise<QueryResult[]> {
  try {
    const results = await query<{
      id: string;
      type: string;
      summary: string;
      content: string | null;
      source_type: string;
      source_id: string;
      source_url: string | null;
      timestamp: Date;
      confidence: number;
    }>(
      `SELECT m.* FROM memory_items m
       JOIN memory_entities me ON m.id = me.memory_id
       JOIN entities e ON me.entity_id = e.id
       WHERE e.name ILIKE $1
       ORDER BY m.timestamp DESC
       LIMIT $2`,
      [`%${entityName}%`, limit]
    );

    return results.map((row) => ({
      memory: {
        id: row.id,
        type: row.type as MemoryType,
        summary: row.summary,
        content: row.content,
        source_type: row.source_type as SourceType,
        source_id: row.source_id,
        source_url: row.source_url,
        timestamp: row.timestamp,
        confidence: row.confidence,
        extracted_at: row.timestamp,
        valid_from: row.timestamp,
        valid_to: null,
        metadata: {},
      },
      score: row.confidence,
      entities: [],
      sources: row.source_url ? [{ type: row.source_type as SourceType, url: row.source_url }] : [],
    }));
  } catch (error) {
    console.error('Get memories by entity error:', error);
    return [];
  }
}

export async function processAndStoreMemory(
  sourceType: SourceType,
  sourceId: string,
  content: string,
  timestamp: Date,
  sourceUrl?: string
): Promise<void> {
  const { extractMemory } = await import('../extraction/gemini.js');
  
  const extractions = await extractMemory(content);
  
  for (const extraction of extractions) {
    const memoryId = await createMemory(
      extraction.type,
      extraction.summary,
      sourceType,
      sourceId,
      content,
      timestamp,
      extraction.confidence,
      sourceUrl,
      { reason: extraction.reason, outcome: extraction.outcome }
    );
    
    if (memoryId) {
      for (const entity of extraction.entities) {
        const entityId = await createEntity(entity.name, entity.type);
        if (entityId) {
          await linkMemoryToEntity(memoryId, entityId, entity.role);
        }
      }
      
      await createMemoryEmbedding(memoryId, extraction.summary);
    }
  }
}
