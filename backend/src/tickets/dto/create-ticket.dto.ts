import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'VPN Setup Issue on macOS', description: 'Subject title of the support ticket' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title: string;

  @ApiProperty({ example: 'I cannot connect to the VPN client after upgrading macOS.', description: 'Detailed description of the issue' })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description: string;

  @ApiPropertyOptional({ example: 'screenshot.png', description: 'Optional attachment filename' })
  @IsOptional()
  @IsString()
  attachmentFilename?: string;
}
