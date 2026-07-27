import React from 'react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  if (!content) return null;

  // Lightweight, clean Markdown renderer tailored for chat messages & AI drafts
  const lines = content.split('\n');

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-1.5 text-sm leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={idx} className="h-0.5" />;

        // Header 3 (###)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-white text-sm pt-1">
              {formatInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }
        // Header 1 or 2 (# or ##)
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="font-bold text-white text-base pt-1">
              {formatInline(trimmed.replace(/^#+\s+/, ''))}
            </h3>
          );
        }

        // Bullet points (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-400 font-bold select-none">•</span>
              <span className="flex-1">{formatInline(trimmed.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        // Numbered list (1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-400 font-medium select-none">{numMatch[1]}.</span>
              <span className="flex-1">{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Regular line
        return <p key={idx}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}
