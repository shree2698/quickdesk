'use client';

import React, { useState, useEffect } from 'react';
import { Pagination } from '@/components/ui/Pagination';

export interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED' | 'ARCHIVED';
  chunkCount: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeListProps {
  documents: KnowledgeDocument[];
  onReindex: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function KnowledgeList({ documents, onReindex, onDelete, loading }: KnowledgeListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [documents.length]);

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'INDEXED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'PROCESSING':
        return 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse';
      case 'UPLOADED':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'FAILED':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'ARCHIVED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">Loading Knowledge Base documents...</div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
        <h4 className="text-lg font-semibold text-slate-200 mb-2">No documents indexed</h4>
        <p className="text-sm text-slate-400 mb-4">
          Upload knowledge base files to enable RAG answers for the AI Assistant.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(documents.length / pageSize);
  const paginatedDocs = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/80 backdrop-blur-md">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Document Title</th>
              <th className="px-6 py-4">Filename</th>
              <th className="px-6 py-4">Upload Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Chunks</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-100">{doc.title}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{doc.filename}</td>
                <td className="px-6 py-4 text-slate-400">
                  {new Date(doc.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle(
                      doc.status,
                    )}`}
                  >
                    {doc.status}
                  </span>
                  {doc.failureReason && (
                    <p className="text-xs text-rose-400 mt-1 max-w-xs truncate" title={doc.failureReason}>
                      {doc.failureReason}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 font-mono">{doc.chunkCount}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onReindex(doc.id)}
                    disabled={doc.status === 'PROCESSING'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md transition-colors disabled:opacity-50"
                  >
                    Re-index
                  </button>
                  <button
                    onClick={() => onDelete(doc.id)}
                    disabled={doc.status === 'PROCESSING'}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs rounded-md border border-rose-900/80 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={documents.length}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
