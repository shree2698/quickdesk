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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Knowledge Base Management
            </h1>
            <p className="text-slate-400 mt-1">
              Upload, re-index, and manage asynchronous RAG ingestion documents indexed into PGVector.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm flex items-center justify-center gap-2"
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
    </div>
  );
}
