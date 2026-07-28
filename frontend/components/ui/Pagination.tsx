'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-slate-200/80 text-xs font-medium text-slate-600">
      <div>
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First Page"
          className="p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous Page"
          className="p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-2 text-slate-400">
                {page}
              </span>
            ),
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next Page"
          className="p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last Page"
          className="p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
