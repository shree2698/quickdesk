import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Knowledge Base')
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('upload')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload Knowledge Base file (Async processing)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @GetUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.knowledgeService.uploadDocument(file, title, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List all Knowledge Base documents with pagination',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: import('@prisma/client').KnowledgeBase[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.knowledgeService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Knowledge Base document details' })
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'View document processing status' })
  async getStatus(@Param('id') id: string) {
    return this.knowledgeService.getStatus(id);
  }

  @Post(':id/reindex')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Re-index Knowledge Base document' })
  async reindex(@Param('id') id: string) {
    return this.knowledgeService.reindexDocument(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete Knowledge Base document' })
  async remove(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id);
  }
}
