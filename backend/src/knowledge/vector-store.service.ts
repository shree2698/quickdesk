import { Injectable, Logger } from '@nestjs/common';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactory } from '../ai/llm-factory';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private embeddings: Embeddings;

  constructor(private readonly prisma: PrismaService) {
    this.embeddings = LlmFactory.createEmbeddings();
  }

  getEmbeddingsInstance(): Embeddings {
    return this.embeddings;
  }

  async addDocuments(
    knowledgeBaseId: string,
    docs: Document[],
  ): Promise<number> {
    const validDocs = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.trim().length > 0,
    );

    if (validDocs.length === 0) {
      this.logger.warn(
        `No non-empty document content to index for KB: ${knowledgeBaseId}`,
      );
      return 0;
    }

    this.logger.log(
      `Generating embeddings and indexing ${validDocs.length} chunks for KB: ${knowledgeBaseId}`,
    );

    // Process in batches of 10 to respect API rate limits
    const batchSize = 10;
    let storedCount = 0;

    for (let i = 0; i < validDocs.length; i += batchSize) {
      const batch = validDocs.slice(i, i + batchSize);
      const texts = batch.map((doc) => doc.pageContent);

      // Attempt embedding with one retry on failure
      let vectors: number[][] | null = null;
      try {
        vectors = await this.embeddings.embedDocuments(texts);
      } catch (e: unknown) {
        const err = e as Error;
        this.logger.warn(
          `Embedding batch ${i}-${i + batch.length} failed: ${err.message}. Retrying after 2s...`,
        );
        await new Promise((r) => setTimeout(r, 2000));
        try {
          vectors = await this.embeddings.embedDocuments(texts);
        } catch (retryErr: unknown) {
          const rErr = retryErr as Error;
          this.logger.error(
            `Embedding retry failed for batch ${i}-${i + batch.length}: ${rErr.message}. Storing chunks without embeddings.`,
          );
        }
      }

      for (let j = 0; j < batch.length; j++) {
        const doc = batch[j];
        const rawVector = vectors ? vectors[j] : null;
        const vector = rawVector ? rawVector.slice(0, 768) : null;
        const chunkIndex = i + j;

        // Enrich metadata with totalChunks for traceability
        const enrichedMetadata = {
          ...(doc.metadata || {}),
          knowledgeBaseId,
          chunkIndex,
          totalChunks: validDocs.length,
        };

        if (vector && vector.length > 0) {
          const vectorSql = `[${vector.join(',')}]`;
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO knowledge_base_chunks (id, "knowledgeBaseId", "chunkIndex", content, metadata, embedding)
             VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::vector)`,
            knowledgeBaseId,
            chunkIndex,
            doc.pageContent,
            JSON.stringify(enrichedMetadata),
            vectorSql,
          );
        } else {
          // Store chunk without embedding — still available for full-text fallback
          this.logger.warn(
            `Chunk ${chunkIndex} stored without embedding for KB: ${knowledgeBaseId}`,
          );
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO knowledge_base_chunks (id, "knowledgeBaseId", "chunkIndex", content, metadata)
             VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb)`,
            knowledgeBaseId,
            chunkIndex,
            doc.pageContent,
            JSON.stringify(enrichedMetadata),
          );
        }

        storedCount++;
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < validDocs.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return storedCount;
  }

  async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<void> {
    await this.prisma.knowledgeBaseChunk.deleteMany({
      where: { knowledgeBaseId },
    });
  }

  async similaritySearch(query: string, k = 4): Promise<Document[]> {
    const fullQueryVector = await this.embeddings.embedQuery(query);
    const queryVector = fullQueryVector.slice(0, 768);
    const vectorSql = `[${queryVector.join(',')}]`;

    const results: Array<{
      id: string;
      knowledgeBaseId: string;
      content: string;
      metadata: any;
      similarity: number;
    }> = await this.prisma.$queryRawUnsafe(
      `SELECT id, "knowledgeBaseId", content, metadata, 1 - (embedding <=> $1::vector) as similarity
       FROM knowledge_base_chunks
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $2`,
      vectorSql,
      k,
    );

    return results.map(
      (r) =>
        new Document({
          pageContent: r.content,
          metadata: {
            ...(typeof r.metadata === 'string'
              ? JSON.parse(r.metadata)
              : r.metadata),
            knowledgeBaseId: r.knowledgeBaseId,
            score: r.similarity,
          },
        }),
    );
  }
}
