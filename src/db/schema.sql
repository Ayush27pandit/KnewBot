-- KnewBot Database Schema
-- Run this against PostgreSQL (Supabase free tier)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory items table
CREATE TABLE memory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('decision', 'incident', 'pr', 'project', 'system', 'person')),
    summary TEXT NOT NULL,
    content TEXT,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('slack', 'github', 'docs')),
    source_id VARCHAR(255) NOT NULL,
    source_url TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(3, 2) DEFAULT 0.5,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Entities table (people, systems, projects)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('person', 'team', 'system', 'project', 'repo', 'service')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Memory-Entity relationships
CREATE TABLE memory_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'mentioned',
    UNIQUE(memory_id, entity_id, role)
);

-- Memory-Memory relationships
CREATE TABLE memory_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_memory_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    to_memory_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) CHECK (relation_type IN ('related_to', 'supersedes', 'caused_by', 'affects', 'decided_by')),
    UNIQUE(from_memory_id, to_memory_id, relation_type)
);

-- Embeddings table for semantic search
CREATE TABLE memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    embedding vector(3072),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(memory_id)
);

-- Indexes
CREATE INDEX idx_memory_items_type ON memory_items(type);
CREATE INDEX idx_memory_items_source ON memory_items(source_type, source_id);
CREATE INDEX idx_memory_items_timestamp ON memory_items(timestamp DESC);
CREATE INDEX idx_memory_items_confidence ON memory_items(confidence DESC);

CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_name ON entities(name);

CREATE INDEX idx_memory_entities_memory ON memory_entities(memory_id);
CREATE INDEX idx_memory_entities_entity ON memory_entities(entity_id);

CREATE INDEX idx_memory_embeddings_cosine ON memory_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Full-text search
CREATE INDEX idx_memory_items_search ON memory_items USING GIN(to_tsvector('english', summary || ' ' || COALESCE(content, '')));
