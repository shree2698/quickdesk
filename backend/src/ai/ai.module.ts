import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { AiService } from './ai.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [RagService, AiService],
  exports: [RagService, AiService],
})
export class AiModule {}
