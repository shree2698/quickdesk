import { Injectable, Logger } from '@nestjs/common';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RagService } from './rag.service';
import { LlmFactory } from './llm-factory';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private model: BaseChatModel;

  constructor(private ragService: RagService) {
    this.model = LlmFactory.createChatModel(0.1);
  }

  /**
   * Predicts ticket category (IT | HR | FINANCE | GENERAL | OTHER) and priority (LOW | MEDIUM | HIGH | URGENT).
   * Uses LangChain LCEL chain with dynamic model from env.
   */
  async classifyTicket(
    title: string,
    description: string,
  ): Promise<{
    category: TicketCategory;
    priority: TicketPriority;
  }> {
    const promptTemplate = PromptTemplate.fromTemplate(`
Classify the following support ticket into a Category and Priority.

Categories allowed: IT, HR, FINANCE, GENERAL, OTHER
Priorities allowed: LOW, MEDIUM, HIGH, URGENT

Ticket Title: "{title}"
Ticket Description: "{description}"

Respond ONLY in valid JSON format:
{{
  "category": "IT | HR | FINANCE | GENERAL | OTHER",
  "priority": "LOW | MEDIUM | HIGH | URGENT"
}}`);

    const chain = promptTemplate
      .pipe(this.model)
      .pipe(new StringOutputParser());

    try {
      const output = await chain.invoke({ title, description });
      const text = output?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const validCategories = Object.values(TicketCategory);
        const validPriorities = Object.values(TicketPriority);

        const category = validCategories.includes(parsed.category)
          ? (parsed.category as TicketCategory)
          : TicketCategory.OTHER;

        const priority = validPriorities.includes(parsed.priority)
          ? (parsed.priority as TicketPriority)
          : TicketPriority.LOW;

        return { category, priority };
      }
    } catch (err: any) {
      this.logger.warn(
        `AI classification failed, falling back to defaults: ${err.message}`,
      );
    }

    return { category: TicketCategory.GENERAL, priority: TicketPriority.LOW };
  }

  /**
   * Generates a context-aware AI copilot response draft for agents using RAG over the Knowledge Base.
   * Uses LangChain LCEL chain with dynamic model from env.
   */
  async generateCopilotDraft(
    ticketTitle: string,
    ticketDescription: string,
    employeeName = 'Employee',
    chatHistory = 'No previous messages.',
  ) {
    // Token optimization: limit inputs to prevent high context consumption
    const trimmedTitle = ticketTitle.slice(0, 150);
    const trimmedDescription = ticketDescription.slice(0, 400);
    const trimmedHistory = chatHistory.slice(-400);

    const query = `${trimmedTitle} ${trimmedDescription} ${trimmedHistory}`;
    const relevantChunks = await this.ragService.answerQuestion(query);

    const contextText = relevantChunks.sources
      .map((c) => `[Source: ${c.title}]\n${c.content.slice(0, 450)}`)
      .join('\n\n');

    const promptTemplate =
      PromptTemplate.fromTemplate(`You are QuickDesk Agent Copilot.
Draft a concise, friendly chat reply to employee "{employeeName}".

Rules:
- Address employee by name "{employeeName}" in opening.
- Concise markdown format with key points.
- Base response on internal guides below if relevant.

Title: {ticketTitle}
Description: {ticketDescription}
Chat History: {chatHistory}
Internal Guides: {contextText}

Reply Draft:`);

    const chain = promptTemplate
      .pipe(this.model)
      .pipe(new StringOutputParser());

    let suggestion = '';
    try {
      suggestion = await chain.invoke({
        employeeName,
        ticketTitle: trimmedTitle,
        ticketDescription: trimmedDescription,
        chatHistory: trimmedHistory,
        contextText: contextText || 'No relevant internal guides found.',
      });
    } catch (err: any) {
      this.logger.error(`Copilot draft generation failed: ${err.message}`);
      const isRateLimit =
        err.status === 429 ||
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('Too Many Requests');

      if (isRateLimit) {
        suggestion = `[AI Copilot Note: Rate limit reached for AI service. Please compose your reply manually or try clicking 'Suggest Draft' again in a few seconds.]`;
      } else {
        suggestion = `Hello,\n\nThank you for reaching out regarding "${ticketTitle}". We are looking into your issue and will get back to you shortly.`;
      }
    }

    const citations = relevantChunks.sources.map((c) => ({
      articleId: c.knowledgeBaseId || '',
      title: c.title || 'Knowledge Base',
      snippet: c.content.substring(0, 100) + '...',
    }));

    return {
      suggestion,
      citations,
    };
  }
}
