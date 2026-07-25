import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdatePriorityDto {
  @ApiProperty({ enum: TicketPriority, example: TicketPriority.HIGH, description: 'New priority value' })
  @IsEnum(TicketPriority, { message: 'Invalid priority' })
  @IsNotEmpty({ message: 'Priority is required' })
  priority: TicketPriority;
}
