import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { KnowledgeUploadProcessor } from './knowledge-upload.processor';

export interface KnowledgeReindexJobData {
  knowledgeBaseId: string;
}

@Processor('knowledge-reindex')
export class KnowledgeReindexProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeReindexProcessor.name);

  constructor(private readonly uploadProcessor: KnowledgeUploadProcessor) {
    super();
  }

  async process(job: Job<KnowledgeReindexJobData>): Promise<any> {
    this.logger.log(`Re-indexing knowledge base ID: ${job.data.knowledgeBaseId}`);
    return this.uploadProcessor.process(job as any);
  }
}
