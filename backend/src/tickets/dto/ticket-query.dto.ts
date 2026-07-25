import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';

export class TicketQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filter by ticket status' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketCategory, description: 'Filter by ticket category' })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Filter by ticket priority' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Search term for ticket title' })
  @IsOptional()
  @IsString()
  search?: string;
}
