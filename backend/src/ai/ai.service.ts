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

    const chain = promptTemplate.pipe(this.model).pipe(new StringOutputParser());

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
      this.logger.warn(`AI classification failed, falling back to defaults: ${err.message}`);
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
  ) {
    const query = `${ticketTitle} ${ticketDescription}`;
    const relevantChunks = await this.ragService.answerQuestion(query);

    const contextText = relevantChunks.sources
      .map((c) => `Source: ${c.title}\n"${c.content}"`)
      .join('\n\n');

    const promptTemplate = PromptTemplate.fromTemplate(`
You are QuickDesk Agent Copilot AI.
Generate a concise, friendly, real-time CHAT MESSAGE draft for a support agent to send directly to employee "{employeeName}" in a live helpdesk chat.

CRITICAL FORMATTING & STYLE RULES:
1. Address employee naturally by name "{employeeName}" in a warm, direct CHAT message opening (e.g. "Hi {employeeName}, ...").
2. DO NOT write an email! DO NOT include "Subject:", DO NOT include formal email headers, and DO NOT include formal sign-offs (e.g. "Best regards", "QuickDesk Agent Copilot AI").
3. Use clean Markdown (short paragraphs, bullet points, bold key terms) for fast chat reading.
4. Ground your reply strictly on the internal knowledge base articles provided below if available.
5. If no relevant internal guides are found, state cleanly that no matching guide was found in our documentation, ask 2-3 brief troubleshooting questions, and suggest next steps.

[Employee Name]
{employeeName}

[Ticket Title]
{ticketTitle}

[Ticket Description]
{ticketDescription}

[Relevant Internal Guides]
{contextText}

Generate ONLY the chat message content:`);

    const chain = promptTemplate.pipe(this.model).pipe(new StringOutputParser());

    let suggestion = '';
    try {
      suggestion = await chain.invoke({
        employeeName,
        ticketTitle,
        ticketDescription,
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
