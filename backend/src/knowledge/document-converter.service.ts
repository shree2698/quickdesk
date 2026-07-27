import { Injectable, Logger } from '@nestjs/common';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class DocumentConverterService {
  private readonly logger = new Logger(DocumentConverterService.name);

  /**
   * Converts uploaded files (PDF, DOCX, CSV, TXT) to Markdown (.md) string content
   */
  async convertToMarkdown(filePath: string, mimeType: string, filename: string): Promise<string> {
    const ext = path.extname(filename).toLowerCase();
    this.logger.log(`Converting ${filename} (${ext}) to Markdown...`);

    if (ext === '.md') {
      return await fs.readFile(filePath, 'utf-8');
    }

    if (ext === '.pdf' || mimeType.includes('pdf')) {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      const title = path.basename(filename, ext);
      const pagesMd = docs
        .map((d, idx) => `## Page ${idx + 1}\n\n${d.pageContent.trim()}`)
        .join('\n\n---\n\n');
      return `# ${title}\n\n${pagesMd}`;
    }

    if (ext === '.docx' || mimeType.includes('officedocument.wordprocessingml')) {
      const loader = new DocxLoader(filePath);
      const docs = await loader.load();
      const title = path.basename(filename, ext);
      const content = docs.map((d) => d.pageContent.trim()).join('\n\n');
      return `# ${title}\n\n${content}`;
    }

    if (ext === '.csv' || mimeType.includes('csv')) {
      const loader = new CSVLoader(filePath);
      const docs = await loader.load();
      const title = path.basename(filename, ext);
      const content = docs.map((d) => d.pageContent.trim()).join('\n\n');
      return `# ${title}\n\n${content}`;
    }

    // Default TXT file conversion
    const textContent = await fs.readFile(filePath, 'utf-8');
    const title = path.basename(filename, ext);
    return `# ${title}\n\n${textContent}`;
  }
}
