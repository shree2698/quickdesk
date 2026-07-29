import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentConverterService } from './document-converter.service';
import { KnowledgeBaseStatus, KnowledgeBase } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly documentConverterService: DocumentConverterService,
    @InjectQueue('knowledge-upload') private readonly uploadQueue: Queue,
    @InjectQueue('knowledge-reindex') private readonly reindexQueue: Queue,
    @InjectQueue('knowledge-delete') private readonly deleteQueue: Queue,
  ) {}

  async uploadDocument(
    file: Express.Multer.File,
    title: string | undefined,
    userId: string,
  ): Promise<KnowledgeBase> {
    // 1. Store temporary original file
    const { storagePath: tempPath } = await this.storageService.saveFile(file);

    // 2. Convert document (PDF, DOCX, CSV, TXT) into Markdown (.md) content
    const mdContent = await this.documentConverterService.convertToMarkdown(
      tempPath,
      file.mimetype,
      file.originalname,
    );

    // 3. Save converted .md file to disk
    const { filename: mdFilename } =
      await this.storageService.saveTextAsMarkdown(
        file.originalname,
        mdContent,
      );

    // Clean up temporary original upload file if it was not already an .md file
    if (path.extname(file.originalname).toLowerCase() !== '.md') {
      await this.storageService.deleteFile(tempPath);
    }

    // 4. Create Knowledge Base record storing ONLY the dynamic relative filename in storagePath
    const docTitle = title || file.originalname;
    const baseNameWithoutExt = path.parse(file.originalname).name;
    const finalDisplayFilename = `${baseNameWithoutExt}.md`;

    const kb = await this.prisma.knowledgeBase.create({
      data: {
        title: docTitle,
        filename: finalDisplayFilename,
        mimeType: 'text/markdown',
        storagePath: mdFilename,
        status: KnowledgeBaseStatus.UPLOADED,
        uploadedBy: userId,
      },
    });

    // 5. Queue BullMQ job for background embedding & indexing
    await this.uploadQueue.add('process-upload', {
      knowledgeBaseId: kb.id,
    });

    // 6. Return success immediately
    return kb;
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<{
    data: KnowledgeBase[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.knowledgeBase.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.prisma.knowledgeBase.count(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const data = await this.prisma.knowledgeBase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length || 1,
      totalPages: 1,
    };
  }

  async findOne(id: string): Promise<KnowledgeBase> {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!kb) {
      throw new NotFoundException(
        `KnowledgeBase document with ID "${id}" not found`,
      );
    }
    return kb;
  }

  async getStatus(id: string) {
    const kb = await this.findOne(id);
    return {
      id: kb.id,
      title: kb.title,
      status: kb.status,
      chunkCount: kb.chunkCount,
      failureReason: kb.failureReason,
      updatedAt: kb.updatedAt,
    };
  }

  async reindexDocument(id: string): Promise<KnowledgeBase> {
    const kb = await this.findOne(id);

    // Update status to PROCESSING
    const updated = await this.prisma.knowledgeBase.update({
      where: { id },
      data: { status: KnowledgeBaseStatus.PROCESSING, failureReason: null },
    });

    // Queue reindex job
    await this.reindexQueue.add('process-reindex', {
      knowledgeBaseId: kb.id,
    });

    return updated;
  }

  async deleteDocument(id: string): Promise<{ message: string }> {
    const kb = await this.findOne(id);

    // Update status to ARCHIVED while deletion is queued
    await this.prisma.knowledgeBase.update({
      where: { id },
      data: { status: KnowledgeBaseStatus.ARCHIVED },
    });

    await this.deleteQueue.add('process-delete', {
      knowledgeBaseId: kb.id,
      storagePath: kb.storagePath,
    });

    return { message: `Deletion job queued for document ${id}` };
  }
}
