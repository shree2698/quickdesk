'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { KnowledgeList, KnowledgeDocument } from '@/components/knowledge/knowledge-list';
import { KnowledgeUploadModal } from '@/components/knowledge/knowledge-upload-modal';
import { api } from '@/lib/api';

export default function AdminKnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDocuments = useCallback(async (page = currentPage) => {
    try {
      const res = await api.get('/knowledge', {
        params: { page, limit: pageSize },
      });
      if (res.data && Array.isArray(res.data.data)) {
        setDocuments(res.data.data);
        setTotalDocuments(res.data.total);
      } else if (Array.isArray(res.data)) {
        setDocuments(res.data);
        setTotalDocuments(res.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base documents', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchDocuments(currentPage);
    // Poll status every 4 seconds to reflect async processing updates seamlessly
    const interval = setInterval(() => fetchDocuments(currentPage), 4000);
    return () => clearInterval(interval);
  }, [fetchDocuments, currentPage]);

  const handleReindex = async (id: string) => {
    try {
      await api.post(`/knowledge/${id}/reindex`);
      fetchDocuments(currentPage);
    } catch (err) {
      console.error('Failed to trigger re-index', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Knowledge Base document?')) return;
    try {
      await api.delete(`/knowledge/${id}`);
      fetchDocuments(currentPage);
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Knowledge Base Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload, re-index, and manage asynchronous RAG ingestion documents indexed into PGVector.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>+ Upload Document</span>
        </button>
      </div>

      {/* Document List Table */}
      <KnowledgeList
        documents={documents}
        totalDocuments={totalDocuments}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onReindex={handleReindex}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Upload Modal */}
      <KnowledgeUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchDocuments(currentPage)}
      />
    </div>
  );
}
