import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: 'text-embedding-004',
    });
  }

  getEmbeddingsInstance(): GoogleGenerativeAIEmbeddings {
    return this.embeddings;
  }

  async addDocuments(knowledgeBaseId: string, docs: Document[]): Promise<number> {
    this.logger.log(`Generating embeddings and indexing ${docs.length} chunks for KB: ${knowledgeBaseId}`);
    
    // Process in batches of 10 to respect API rate limits
    const batchSize = 10;
    let storedCount = 0;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      const texts = batch.map((doc) => doc.pageContent);
      
      const vectors = await this.embeddings.embedDocuments(texts);

      for (let j = 0; j < batch.length; j++) {
        const doc = batch[j];
        const vector = vectors[j];
        const chunkIndex = i + j;

        const vectorSql = `[${vector.join(',')}]`;

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO knowledge_base_chunks (id, "knowledgeBaseId", "chunkIndex", content, metadata, embedding)
           VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::vector)`,
          knowledgeBaseId,
          chunkIndex,
          doc.pageContent,
          JSON.stringify(doc.metadata || {}),
          vectorSql,
        );

        storedCount++;
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
    const queryVector = await this.embeddings.embedQuery(query);
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
            ...(typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata),
            knowledgeBaseId: r.knowledgeBaseId,
            score: r.similarity,
          },
        }),
    );
  }
}
