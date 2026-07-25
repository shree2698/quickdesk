import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private ai: GoogleGenAI | null = null;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY missing in environment variables. AI functionality will fallback.');
    }
  }

  async onModuleInit() {
    try {
      await this.indexKnowledgeBase();
    } catch (err) {
      this.logger.error(`Error during Knowledge Base indexing: ${err.message}`);
    }
  }

  /**
   * Reads markdown documents from knowledge-base directory, chunks them,
   * generates vector embeddings using text-embedding-004, and indexes them in PostgreSQL.
   */
  async indexKnowledgeBase() {
    const kbDir = path.join(process.cwd(), 'knowledge-base');
    if (!fs.existsSync(kbDir)) {
      this.logger.warn(`Knowledge base directory not found at ${kbDir}`);
      return;
    }

    const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
    this.logger.log(`Found ${files.length} markdown documents in knowledge-base/`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', ' ', ''],
    });

    for (const file of files) {
      const filePath = path.join(kbDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = file.replace('.md', '').replace(/-/g, ' ').toUpperCase();

      // Upsert KnowledgeArticle
      const article = await this.prisma.knowledgeArticle.upsert({
        where: { filename: file },
        update: { title },
        create: { title, filename: file },
      });

      const docs = await splitter.createDocuments([content]);
      this.logger.log(`Split ${file} into ${docs.length} chunks`);

      // Delete existing chunks for this article to re-index
      await this.prisma.knowledgeArticleChunk.deleteMany({
        where: { articleId: article.id },
      });

      for (let i = 0; i < docs.length; i++) {
        const chunkText = docs[i].pageContent;
        let embeddingVector: number[] | null = null;

        if (this.ai) {
          try {
            const embedRes = await this.ai.models.embedContent({
              model: 'text-embedding-004',
              contents: chunkText,
            });
            embeddingVector = embedRes.embeddings?.[0]?.values || null;
          } catch (embedError) {
            this.logger.warn(`Embedding failed for ${file} chunk ${i}: ${embedError.message}`);
          }
        }

        const chunk = await this.prisma.knowledgeArticleChunk.create({
          data: {
            articleId: article.id,
            content: chunkText,
            chunkIndex: i,
          },
        });

        if (embeddingVector && embeddingVector.length > 0) {
          const vectorStr = `[${embeddingVector.join(',')}]`;
          await this.prisma.$executeRawUnsafe(
            `UPDATE "KnowledgeArticleChunk" SET embedding = $1::vector WHERE id = $2`,
            vectorStr,
            chunk.id,
          );
        }
      }
    }

    this.logger.log('Knowledge Base indexing completed successfully.');
  }

  /**
   * Searches knowledge base chunks for text similar to query using cosine distance query.
   */
  async searchSimilarChunks(query: string, limit = 3) {
    if (!this.ai) {
      return this.fallbackKeywordSearch(query, limit);
    }

    try {
      const embedRes = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });
      const queryVector = embedRes.embeddings?.[0]?.values;

      if (!queryVector || queryVector.length === 0) {
        return this.fallbackKeywordSearch(query, limit);
      }

      const vectorStr = `[${queryVector.join(',')}]`;
      const rawResults: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT c.id, c.content, c."articleId", a.title as "articleTitle", (c.embedding <=> $1::vector) as distance
         FROM "KnowledgeArticleChunk" c
         JOIN "KnowledgeArticle" a ON c."articleId" = a.id
         WHERE c.embedding IS NOT NULL
         ORDER BY distance ASC
         LIMIT $2`,
        vectorStr,
        limit,
      );

      return rawResults.map((r) => ({
        id: r.id,
        content: r.content,
        articleId: r.articleId,
        articleTitle: r.articleTitle,
        distance: parseFloat(r.distance),
      }));
    } catch (err) {
      this.logger.warn(`Vector search failed, falling back to keyword search: ${err.message}`);
      return this.fallbackKeywordSearch(query, limit);
    }
  }

  private async fallbackKeywordSearch(query: string, limit: number) {
    const chunks = await this.prisma.knowledgeArticleChunk.findMany({
      take: limit,
      include: { article: true },
    });

    return chunks.map((c) => ({
      id: c.id,
      content: c.content,
      articleId: c.articleId,
      articleTitle: c.article.title,
      distance: 0.5,
    }));
  }

  /**
   * Answers a user Q&A query using RAG with grounding & citations.
   */
  async answerQuestion(query: string) {
    const relevantChunks = await this.searchSimilarChunks(query, 3);

    // Fallback threshold check
    const isRelevant = relevantChunks.some((c) => c.distance < 0.65);
    if (!isRelevant && relevantChunks.length > 0) {
      return {
        answer:
          "I'm sorry, but I couldn't find relevant information in our documentation. Would you like me to open a support ticket for an agent to assist you?",
        citations: [],
        canCreateTicket: true,
      };
    }

    const contextText = relevantChunks
      .map((c) => `[Source: ${c.articleTitle}]\n"${c.content}"`)
      .join('\n\n');

    const prompt = `You are QuickDesk AI, an internal corporate support assistant.
Answer the user question strictly using only the context information provided below.
Cite the source article title in brackets next to the facts you state.
If the answer cannot be found in the context, say "I'm sorry, but I cannot find that information in our company documentation."

[Context]
${contextText}

[Question]
${query}

[Answer]`;

    let answer = '';
    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        answer = response.text || '';
      } catch (err) {
        this.logger.error(`Gemini generation failed: ${err.message}`);
        answer = 'I am currently unable to generate an AI answer. Please submit a ticket for agent assistance.';
      }
    } else {
      answer = `Based on our documentation:\n${contextText}`;
    }

    const citations = relevantChunks.map((c) => ({
      articleId: c.articleId,
      title: c.articleTitle,
      snippet: c.content.substring(0, 100) + '...',
    }));

    return {
      answer,
      citations,
      canCreateTicket: false,
    };
  }
}
