import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly uploadDir = path.join(
    process.cwd(),
    'uploads',
    'knowledge-base',
  );

  constructor() {
    void this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create knowledge-base upload directory', error);
    }
  }

  async saveFile(
    file: Express.Multer.File,
  ): Promise<{ storagePath: string; filename: string }> {
    await this.ensureUploadDir();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedBase}_${uniqueSuffix}${ext}`;
    const storagePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(storagePath, file.buffer);
      return { storagePath, filename };
    } catch (error) {
      const err = error as Error;
      throw new InternalServerErrorException(
        `Failed to save original file: ${err.message}`,
      );
    }
  }

  async saveTextAsMarkdown(
    originalFilename: string,
    markdownContent: string,
  ): Promise<{ storagePath: string; filename: string }> {
    await this.ensureUploadDir();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(originalFilename);
    const sanitizedBase = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedBase}_${uniqueSuffix}.md`;
    const storagePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(storagePath, markdownContent, 'utf-8');
      return { storagePath, filename };
    } catch (error) {
      const err = error as Error;
      throw new InternalServerErrorException(
        `Failed to save Markdown file: ${err.message}`,
      );
    }
  }

  getAbsolutePath(filenameOrPath: string): string {
    if (path.isAbsolute(filenameOrPath)) {
      return filenameOrPath;
    }
    return path.join(this.uploadDir, filenameOrPath);
  }

  getPublicUrl(filenameOrPath: string): string {
    const filename = path.basename(filenameOrPath);
    const baseUrl =
      process.env.UPLOAD_BASE_URL ||
      'http://localhost:5000/uploads/knowledge-base';
    return `${baseUrl.replace(/\/$/, '')}/${filename}`;
  }

  async getFileStream(storagePath: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(storagePath);
    return fs.readFile(fullPath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      const fullPath = this.getAbsolutePath(storagePath);
      await fs.unlink(fullPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
