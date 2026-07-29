import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { VectorStoreService } from '../../knowledge/vector-store.service';

export interface KnowledgeDeleteJobData {
  knowledgeBaseId: string;
  storagePath: string;
}

@Processor('knowledge-delete')
export class KnowledgeDeleteProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeDeleteProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    super();
  }

  async process(job: Job<KnowledgeDeleteJobData>): Promise<any> {
    const { knowledgeBaseId, storagePath } = job.data;
    this.logger.log(`Processing deletion for KB: ${knowledgeBaseId}`);

    try {
      // 1. Delete vector embeddings
      await this.vectorStoreService.deleteByKnowledgeBaseId(knowledgeBaseId);

      // 2. Delete physical storage file
      if (storagePath) {
        await this.storageService.deleteFile(storagePath);
      }

      // 3. Delete database record
      await this.prisma.knowledgeBase.delete({
        where: { id: knowledgeBaseId },
      });

      this.logger.log(`Successfully deleted KB: ${knowledgeBaseId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete KB: ${knowledgeBaseId}`, err.stack);
      throw err;
    }
  }
}
