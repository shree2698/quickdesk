import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { RagService } from './rag.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI | null = null;

  constructor(private ragService: RagService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Predicts ticket category (IT | HR | FINANCE | GENERAL | OTHER) and priority (LOW | MEDIUM | HIGH | URGENT).
   */
  async classifyTicket(title: string, description: string): Promise<{
    category: TicketCategory;
    priority: TicketPriority;
  }> {
    if (!this.ai) {
      return { category: TicketCategory.GENERAL, priority: TicketPriority.LOW };
    }

    const prompt = `Classify the following support ticket into a Category and Priority.

Categories allowed: IT, HR, FINANCE, GENERAL, OTHER
Priorities allowed: LOW, MEDIUM, HIGH, URGENT

Ticket Title: "${title}"
Ticket Description: "${description}"

Respond ONLY in valid JSON format:
{
  "category": "IT | HR | FINANCE | GENERAL | OTHER",
  "priority": "LOW | MEDIUM | HIGH | URGENT"
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || '';
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
    } catch (err) {
      this.logger.warn(`AI classification failed, falling back to defaults: ${err.message}`);
    }

    return { category: TicketCategory.GENERAL, priority: TicketPriority.LOW };
  }

  /**
   * Generates a context-aware AI copilot response draft for agents using RAG over the Knowledge Base.
   */
  async generateCopilotDraft(ticketTitle: string, ticketDescription: string) {
    const query = `${ticketTitle} ${ticketDescription}`;
    const relevantChunks = await this.ragService.answerQuestion(query);

    const contextText = relevantChunks.sources
      .map((c) => `[Snippet]\n"${c.content}"`)
      .join('\n\n');

    const prompt = `You are QuickDesk Agent Copilot AI.
Generate a professional, helpful support reply draft for an agent responding to an employee ticket.
Ground your reply strictly on the internal knowledge base articles provided below.

[Ticket Title]
${ticketTitle}

[Ticket Description]
${ticketDescription}

[Relevant Internal Guides]
${contextText}

Write a clear, polite, step-by-step response draft. 
IMPORTANT: If the provided Internal Guides are empty or do not contain the necessary information to answer the ticket, DO NOT hallucinate an answer. Instead, explicitly state that no relevant knowledge base article was found and suggest escalating or asking for more details.`;

    let suggestion = '';
    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        suggestion = response.text || '';
      } catch (err) {
        this.logger.error(`Copilot draft generation failed: ${err.message}`);
        suggestion = `Hello,\n\nThank you for reaching out. Based on your report ("${ticketTitle}"), we are investigating the issue and will update you shortly.`;
      }
    } else {
      suggestion = `Hello,\n\nThank you for reaching out regarding "${ticketTitle}". Here are the relevant guide details:\n\n${contextText}`;
    }

    const citations = relevantChunks.sources.map((c) => ({
      articleId: c.metadata.knowledgeBaseId || '',
      title: c.metadata.filename || 'Knowledge Base',
      snippet: c.content.substring(0, 100) + '...',
    }));

    return {
      suggestion,
      citations,
    };
  }
}
