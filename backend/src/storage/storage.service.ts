import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'knowledge-base');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create knowledge-base upload directory', error);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<{ storagePath: string; filename: string }> {
    await this.ensureUploadDir();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedBase}_${uniqueSuffix}${ext}`;
    const storagePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(storagePath, file.buffer);
      return { storagePath, filename };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to save original file: ${error.message}`);
    }
  }

  async getFileStream(storagePath: string): Promise<Buffer> {
    return fs.readFile(storagePath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
}
