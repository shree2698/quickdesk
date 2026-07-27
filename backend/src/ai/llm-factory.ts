import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Logger } from '@nestjs/common';

export class LlmFactory {
  private static readonly logger = new Logger('LlmFactory');

  /**
   * Creates a LangChain Chat Model based on environment variables:
   * AI_PROVIDER: "google" | "grok" | "openrouter" | "openai" (default: google)
   * AI_MODEL: model name (e.g. gemini-2.0-flash, grok-2-latest, google/gemini-2.0-flash-001, gpt-4o-mini)
   */
  static createChatModel(temperature = 0.2): BaseChatModel {
    const provider = (process.env.AI_PROVIDER || 'google').toLowerCase();

    this.logger.log(`Initializing LLM Chat Model for provider: "${provider}"`);

    switch (provider) {
      case 'grok':
      case 'xai': {
        const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || process.env.OPENAI_API_KEY || '';
        const modelName = process.env.AI_MODEL || 'grok-2-latest';
        this.logger.log(`Using Grok (xAI): model=${modelName}`);
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature,
          configuration: {
            baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
          },
        });
      }

      case 'openrouter': {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
        const modelName = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
        this.logger.log(`Using OpenRouter: model=${modelName}`);
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature,
          configuration: {
            baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          },
        });
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY || '';
        const modelName = process.env.AI_MODEL || 'gpt-4o-mini';
        this.logger.log(`Using OpenAI: model=${modelName}`);
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature,
        });
      }

      case 'google':
      case 'gemini':
      default: {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        const modelName = process.env.AI_MODEL || 'gemini-2.0-flash';
        this.logger.log(`Using Google Gemini: model=${modelName}`);
        return new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName,
          temperature,
        });
      }
    }
  }

  /**
   * Creates a LangChain Embeddings model based on environment variables:
   * AI_PROVIDER: "google" | "grok" | "openrouter" | "openai" (default: google)
   * EMBEDDING_MODEL: model name (e.g. gemini-embedding-001, text-embedding-3-small)
   */
  static createEmbeddings(): Embeddings {
    const provider = (process.env.AI_PROVIDER || 'google').toLowerCase();

    this.logger.log(`Initializing Embeddings for provider: "${provider}"`);

    switch (provider) {
      case 'grok':
      case 'xai': {
        const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || process.env.OPENAI_API_KEY || '';
        const modelName = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        return new OpenAIEmbeddings({
          apiKey,
          modelName,
          configuration: {
            baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
          },
        });
      }

      case 'openrouter': {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
        const modelName = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        return new OpenAIEmbeddings({
          apiKey,
          modelName,
          configuration: {
            baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          },
        });
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY || '';
        const modelName = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        return new OpenAIEmbeddings({
          apiKey,
          modelName,
        });
      }

      case 'google':
      case 'gemini':
      default: {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        const modelName = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
        return new GoogleGenerativeAIEmbeddings({
          apiKey,
          model: modelName,
        });
      }
    }
  }
}
