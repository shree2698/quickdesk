import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { VectorStoreService } from '../knowledge/vector-store.service';
import { Document } from '@langchain/core/documents';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private model: ChatGoogleGenerativeAI;

  constructor(private readonly vectorStoreService: VectorStoreService) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-1.5-flash',
      temperature: 0.2,
    });
  }

  async answerQuestion(question: string): Promise<{ answer: string; sources: any[] }> {
    this.logger.log(`Executing RAG query for question: "${question}"`);

    // 1. Retrieve top relevant chunks from PGVector
    const docs: Document[] = await this.vectorStoreService.similaritySearch(question, 4);

    // Form context string from retrieved documents
    const context = docs.map((doc) => doc.pageContent).join('\n\n---\n\n');

    // Extract citations/sources metadata
    const sources = docs.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    }));

    // 2. Define standard RAG PromptTemplate
    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert AI Assistant answering questions strictly based on the provided Knowledge Base context.
If the answer cannot be deduced from the context, state clearly that the information is not available in the knowledge base.

Context:
{context}

Question:
{question}

Answer:`);

    // 3. Construct LCEL RunnableSequence
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: new RunnablePassthrough(),
      },
      promptTemplate,
      this.model,
      new StringOutputParser(),
    ]);

    // 4. Execute LCEL chain
    const answer = await chain.invoke(question);

    return {
      answer,
      sources,
    };
  }
}
