import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KnowledgeBaseStatus } from '@prisma/client';

export class KnowledgeBaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  storagePath: string;

  @ApiProperty({ enum: KnowledgeBaseStatus })
  status: KnowledgeBaseStatus;

  @ApiProperty()
  uploadedBy: string;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiProperty()
  chunkCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
