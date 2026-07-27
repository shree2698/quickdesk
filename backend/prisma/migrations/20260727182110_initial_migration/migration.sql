/*
  Warnings:

  - You are about to drop the `knowledge_article_chunks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_articles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'INDEXED', 'FAILED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "knowledge_article_chunks" DROP CONSTRAINT "knowledge_article_chunks_articleId_fkey";

-- DropTable
DROP TABLE "knowledge_article_chunks";

-- DropTable
DROP TABLE "knowledge_articles";

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedBy" TEXT NOT NULL,
    "failureReason" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_chunks" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(768),

    CONSTRAINT "knowledge_base_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_kb_chunks_kb_id" ON "knowledge_base_chunks"("knowledgeBaseId");

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_chunks" ADD CONSTRAINT "knowledge_base_chunks_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
