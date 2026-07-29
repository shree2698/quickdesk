import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class SendReplyDto {
  @ApiProperty({
    example: 'Here is the step by step solution...',
    description: 'Final response sent by agent',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reply content cannot be empty' })
  finalReply: string;

  @ApiPropertyOptional({
    example: ['VPN Setup Guide'],
    description: 'Grounding citations referenced in resolution',
  })
  @IsArray()
  @IsOptional()
  ragCitations?: string[];
}
