import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { DocumentConverterService } from './document-converter.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, StorageModule, QueueModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, DocumentConverterService],
  exports: [KnowledgeService, DocumentConverterService],
})
export class KnowledgeModule {}
