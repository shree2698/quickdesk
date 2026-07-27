import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { KnowledgeBaseStatus, KnowledgeBase } from '@prisma/client';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue('knowledge-upload') private readonly uploadQueue: Queue,
    @InjectQueue('knowledge-reindex') private readonly reindexQueue: Queue,
    @InjectQueue('knowledge-delete') private readonly deleteQueue: Queue,
  ) {}

  async uploadDocument(
    file: Express.Multer.File,
    title: string | undefined,
    userId: string,
  ): Promise<KnowledgeBase> {
    // 1. Store original file
    const { storagePath, filename } = await this.storageService.saveFile(file);

    // 2. Create Knowledge Base record with UPLOADED status
    const docTitle = title || file.originalname;
    const kb = await this.prisma.knowledgeBase.create({
      data: {
        title: docTitle,
        filename: file.originalname,
        mimeType: file.mimetype,
        storagePath,
        status: KnowledgeBaseStatus.UPLOADED,
        uploadedBy: userId,
      },
    });

    // 3. Queue BullMQ job for background embedding & indexing
    await this.uploadQueue.add('process-upload', {
      knowledgeBaseId: kb.id,
    });

    // 4. Return success immediately
    return kb;
  }

  async findAll(): Promise<KnowledgeBase[]> {
    return this.prisma.knowledgeBase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });
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
      throw new NotFoundException(`KnowledgeBase document with ID "${id}" not found`);
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
