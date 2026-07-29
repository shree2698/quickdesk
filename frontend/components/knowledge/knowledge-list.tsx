'use client';

import React from 'react';
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
  totalDocuments: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onReindex: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function KnowledgeList({
  documents,
  totalDocuments,
  currentPage,
  pageSize,
  onPageChange,
  onReindex,
  onDelete,
  loading,
}: KnowledgeListProps) {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'INDEXED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'UPLOADED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">Loading Knowledge Base documents...</div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center glass-panel border border-slate-200 rounded-2xl shadow-2xs">
        <h4 className="text-lg font-semibold text-slate-900 mb-2">No documents indexed</h4>
        <p className="text-sm text-slate-500 mb-4">
          Upload knowledge base files to enable RAG answers for the AI Assistant.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalDocuments / pageSize);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto glass-panel border border-slate-200 rounded-2xl shadow-2xs">
        <table className="w-full text-left text-sm text-slate-800">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Document Title</th>
              <th className="px-6 py-4">Filename</th>
              <th className="px-6 py-4">Upload Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Chunks</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900">{doc.title}</td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{doc.filename}</td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(doc.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold border ${getBadgeStyle(
                      doc.status,
                    )}`}
                  >
                    {doc.status}
                  </span>
                  {doc.failureReason && (
                    <p className="text-xs text-rose-600 mt-1 max-w-xs truncate" title={doc.failureReason}>
                      {doc.failureReason}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-slate-700">{doc.chunkCount}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onReindex(doc.id)}
                    disabled={doc.status === 'PROCESSING'}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Re-index
                  </button>
                  <button
                    onClick={() => onDelete(doc.id)}
                    disabled={doc.status === 'PROCESSING'}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
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
        totalItems={totalDocuments}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
}
