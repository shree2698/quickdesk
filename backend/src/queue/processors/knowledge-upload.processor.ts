import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentLoaderService } from '../../knowledge/document-loader.service';
import { VectorStoreService } from '../../knowledge/vector-store.service';
import { KnowledgeBaseStatus } from '@prisma/client';

export interface KnowledgeUploadJobData {
  knowledgeBaseId: string;
}

@Processor('knowledge-upload')
export class KnowledgeUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeUploadProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentLoaderService: DocumentLoaderService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    super();
  }

  async process(job: Job<KnowledgeUploadJobData>): Promise<any> {
    const { knowledgeBaseId } = job.data;
    this.logger.log(`Processing knowledge-upload job for ID: ${knowledgeBaseId}`);

    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!kb) {
      this.logger.error(`KnowledgeBase record not found for ID: ${knowledgeBaseId}`);
      return;
    }

    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { status: KnowledgeBaseStatus.PROCESSING, failureReason: null },
    });

    try {
      // 1. Load document & split into LangChain documents
      const docs = await this.documentLoaderService.loadAndSplit(
        kb.storagePath,
        kb.mimeType,
        kb.filename,
      );

      // Attach knowledgeBaseId metadata
      docs.forEach((doc) => {
        doc.metadata = {
          ...doc.metadata,
          knowledgeBaseId: kb.id,
          title: kb.title,
          filename: kb.filename,
        };
      });

      // 2. Clear old chunks if any
      await this.vectorStoreService.deleteByKnowledgeBaseId(kb.id);

      // 3. Generate embeddings & store using vectorStoreService
      const count = await this.vectorStoreService.addDocuments(kb.id, docs);

      // 4. Update status to INDEXED
      await this.prisma.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: {
          status: KnowledgeBaseStatus.INDEXED,
          chunkCount: count,
        },
      });

      this.logger.log(`Successfully indexed ${count} chunks for KB: ${knowledgeBaseId}`);
    } catch (error) {
      this.logger.error(`Failed to process KB upload for ID: ${knowledgeBaseId}`, error.stack);
      await this.prisma.knowledgeBase.update({
        where: { id: knowledgeBaseId },
        data: {
          status: KnowledgeBaseStatus.FAILED,
          failureReason: error.message || 'Unknown processing error',
        },
      });
      throw error;
    }
  }
}
