import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class ResolveTicketDto {
  @ApiPropertyOptional({
    example: 'Issue resolved after configuring VPN settings.',
    description: 'Final resolution summary',
  })
  @IsString()
  @IsOptional()
  finalReply?: string;

  @ApiPropertyOptional({
    example: ['VPN Setup Guide'],
    description: 'Grounding citations referenced in resolution',
  })
  @IsArray()
  @IsOptional()
  ragCitations?: string[];
}
