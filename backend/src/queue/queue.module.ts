import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { KnowledgeUploadProcessor } from './processors/knowledge-upload.processor';
import { KnowledgeReindexProcessor } from './processors/knowledge-reindex.processor';
import { KnowledgeDeleteProcessor } from './processors/knowledge-delete.processor';
import { DocumentLoaderService } from '../knowledge/document-loader.service';
import { VectorStoreService } from '../knowledge/vector-store.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: 'knowledge-upload' },
      { name: 'knowledge-reindex' },
      { name: 'knowledge-delete' },
    ),
    PrismaModule,
    StorageModule,
  ],
  providers: [
    DocumentLoaderService,
    VectorStoreService,
    KnowledgeUploadProcessor,
    KnowledgeReindexProcessor,
    KnowledgeDeleteProcessor,
  ],
  exports: [BullModule, VectorStoreService, DocumentLoaderService],
})
export class QueueModule {}
