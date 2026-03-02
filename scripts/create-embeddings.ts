import pool from "../src/db/connection.js";
import { generateEmbedding } from "../src/extraction/gemini.js";

async function createEmbeddings() {
  console.log("Creating embeddings for existing memories...");

  const result = await pool.query("SELECT id, summary FROM memory_items");
  const memories = result.rows;

  console.log(`Found ${memories.length} memories to embed`);

  for (const mem of memories) {
    try {
      const embedding = await generateEmbedding(mem.summary);

      await pool.query(
        `INSERT INTO memory_embeddings (memory_id, embedding)
         VALUES ($1, $2)
         ON CONFLICT (memory_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [mem.id, JSON.stringify(embedding)]
      );
      console.log(` Embedded: ${mem.summary.substring(0, 40)}...`);
    } catch (err) {
      console.error(`✗ Error: ${err.message}`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

createEmbeddings();
