import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @ApiProperty({ example: 'How do I set up the VPN on Windows?', description: 'User query for RAG AI assistant' })
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(1000, { message: 'Query message cannot exceed 1000 characters' })
  message: string;
}
