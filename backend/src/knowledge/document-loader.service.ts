import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);

  async loadAndSplit(filePath: string, mimeType: string, filename: string): Promise<Document[]> {
    this.logger.log(`Loading document from ${filePath} with mimeType: ${mimeType}`);
    const ext = path.extname(filename).toLowerCase();

    let mdContent = '';

    if (ext === '.pdf' || mimeType.includes('pdf')) {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      mdContent = docs.map((d) => d.pageContent).join('\n\n');
    } else if (ext === '.docx' || mimeType.includes('officedocument.wordprocessingml')) {
      const loader = new DocxLoader(filePath);
      const docs = await loader.load();
      mdContent = docs.map((d) => d.pageContent).join('\n\n');
    } else if (ext === '.csv' || mimeType.includes('csv')) {
      const loader = new CSVLoader(filePath);
      const docs = await loader.load();
      // Format CSV rows cleanly into Markdown standard format
      mdContent = docs.map((d) => d.pageContent).join('\n\n');
    } else {
      // Standard TXT / MD format
      mdContent = await fs.readFile(filePath, 'utf-8');
    }

    // Wrap extracted content into a unified Markdown Document
    const markdownDoc = new Document({
      pageContent: mdContent,
      metadata: { source: filePath, convertedToMarkdown: true },
    });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments([markdownDoc]);
    this.logger.log(`Split Markdown document into ${splitDocs.length} chunks`);
    return splitDocs;
  }
}
