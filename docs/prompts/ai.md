# AI Prompt

You are an AI Solutions Engineer.

Implement all AI features for QuickDesk.

Use

- LangChain
- Gemini API
- Chroma Vector Store

Requirements

## Ticket Classification

Predict

- Category
- Priority

Categories

- IT
- HR
- Finance
- Admin

Priorities

- Low
- Medium
- High

Store predictions separately from agent overrides.

---

## Knowledge Base

Use markdown files.

Chunk documents.

Generate embeddings.

Store embeddings in Chroma.

---

## RAG

Flow

User Ticket

↓

Retriever

↓

Relevant Documents

↓

Prompt

↓

Gemini

↓

AI Draft

↓

Citation

Return

- draft response
- citations
- confidence if available

---

Do not hallucinate.

If no relevant document exists

respond

"I couldn't find relevant information."

Always return structured JSON.

Use prompt templates.

Keep prompts modular.

Design for future model replacement.