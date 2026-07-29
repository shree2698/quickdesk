import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RagService } from './rag.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ragService: RagService) {}

  @ApiOperation({
    summary: 'Ask question to RAG-assisted AI virtual assistant',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns AI answer with knowledge base citations',
  })
  @Post('chat')
  async chat(@Body() dto: AiChatDto) {
    return this.ragService.answerQuestion(dto.message);
  }
}
