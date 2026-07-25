import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketCategory } from '@prisma/client';

export class UpdateCategoryDto {
  @ApiProperty({ enum: TicketCategory, example: TicketCategory.IT, description: 'New category value' })
  @IsEnum(TicketCategory, { message: 'Invalid category' })
  @IsNotEmpty({ message: 'Category is required' })
  category: TicketCategory;
}
