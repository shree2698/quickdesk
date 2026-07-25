import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendReplyDto {
  @ApiProperty({ example: 'Here is the step by step solution...', description: 'Final response sent by agent' })
  @IsString()
  @IsNotEmpty({ message: 'Reply content cannot be empty' })
  finalReply: string;
}
