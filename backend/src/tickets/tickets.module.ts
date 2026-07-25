import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AiModule } from '../ai/ai.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AiModule, RealtimeModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
