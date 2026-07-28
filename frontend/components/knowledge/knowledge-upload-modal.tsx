'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface KnowledgeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KnowledgeUploadModal({ isOpen, onClose, onSuccess }: KnowledgeUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    try {
      await api.post('/knowledge/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFile(null);
      setTitle('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Upload Knowledge Document</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Employee Handbook 2026"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              File (PDF, DOCX, TXT, MD, CSV)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 file:border-blue-700 file:text-blue-700 cursor-pointer shadow-2xs"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs font-semibold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              {uploading ? 'Queueing Upload...' : 'Upload & Queue Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
