import { Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { VectorStoreService } from '../knowledge/vector-store.service';
import { Document } from '@langchain/core/documents';
import { LlmFactory } from './llm-factory';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private model: BaseChatModel;

  constructor(private readonly vectorStoreService: VectorStoreService) {
    this.model = LlmFactory.createChatModel(0.2);
  }

  async answerQuestion(
    question: string,
  ): Promise<{ answer: string; sources: any[] }> {
    this.logger.log(`Executing RAG query for question: "${question}"`);

    let docs: Document[] = [];
    try {
      docs = await this.vectorStoreService.similaritySearch(question, 4);
    } catch (searchErr: unknown) {
      const error = searchErr as Error;
      this.logger.warn(`Vector search failed or empty: ${error.message}`);
    }

    // 2. Similarity threshold check — fallback if no relevant chunks
    if (
      docs.length === 0 ||
      (docs[0].metadata?.score !== undefined &&
        (docs[0].metadata.score as number) < 0.4)
    ) {
      // Direct conversational fallback response if no documents match
      const fallbackPrompt = PromptTemplate.fromTemplate(
        `You are QuickDesk AI, an internal corporate support assistant. Respond politely, helpfully, and concisely to the employee's message.\n\nUser: {question}\n\nQuickDesk AI:`,
      );
      try {
        const directChain = RunnableSequence.from([
          fallbackPrompt,
          this.model,
          new StringOutputParser(),
        ]);
        const directAnswer = await directChain.invoke({ question });
        return { answer: directAnswer, sources: [] };
      } catch {
        return {
          answer:
            "Hello! I am QuickDesk AI Assistant. I couldn't find a direct match in our documentation for your query. Would you like me to put you in touch with a support agent or help you submit a ticket?",
          sources: [],
        };
      }
    }

    // 3. Build concise context blocks with source article titles for citations
    const context = docs
      .map((doc) => {
        const title =
          doc.metadata?.sourceTitle || doc.metadata?.title || 'Knowledge Base';
        // Slice content to top 600 characters per chunk to conserve LLM context window tokens
        const snippet =
          doc.pageContent.length > 600
            ? doc.pageContent.slice(0, 600) + '...'
            : doc.pageContent;
        return `[Source: ${title}]\n${snippet}`;
      })
      .join('\n\n');

    // Extract citations/sources metadata with title info
    const sources = docs.map((doc) => {
      const meta = doc.metadata as Record<string, unknown>;
      return {
        content: doc.pageContent,
        title:
          (meta?.sourceTitle as string) ||
          (meta?.title as string) ||
          'Knowledge Base',
        knowledgeBaseId: (meta?.knowledgeBaseId as string) || '',
        score: meta?.score as number | undefined,
        metadata: meta,
      };
    });

    // 4. Concise RAG prompt template to minimize token usage
    const promptTemplate =
      PromptTemplate.fromTemplate(`You are QuickDesk AI. Answer using ONLY the context chunks below.
Cite the source article name in brackets next to information you present.
If not in context, state: "I cannot find that in our company documentation. Would you like me to open a ticket?"

Context:
{context}

Question:
{question}

Answer:`);

    // 5. Construct LCEL RunnableSequence
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: new RunnablePassthrough(),
      },
      promptTemplate,
      this.model,
      new StringOutputParser(),
    ]);

    // 6. Execute LCEL chain with rate-limit and error handling
    try {
      const answer = await chain.invoke(question);
      return { answer, sources };
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      this.logger.error(`RAG Execution error: ${error.message}`);

      const isRateLimit =
        error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('Too Many Requests');

      if (isRateLimit) {
        return {
          answer:
            "The AI Assistant is currently experiencing high demand and has reached its rate limit. Please wait a few seconds and try again, or click 'Create Ticket' below to reach a human support agent directly.",
          sources: [],
        };
      }

      return {
        answer:
          "I'm sorry, our AI service is temporarily unavailable right now. Would you like to create a support ticket instead?",
        sources: [],
      };
    }
  }
}
