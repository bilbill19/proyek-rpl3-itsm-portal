import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Renderer konten pesan chatbot.
 *
 * Mendukung subset Markdown yang dipakai system prompt ITSM AI:
 *   ## / ### heading, > blockquote (disclaimer), --- divider,
 *   bullet (-/*), numbered list, **bold**, *italic*, `code`.
 *
 * HTML user/AI di-escape dahulu sebelum inline-markdown dipasang,
 * sehingga konten dari model tidak bisa menyuntikkan markup berbahaya.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em class="italic opacity-90">$2</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] border border-slate-300 dark:border-slate-700">$1</code>'
    );
}

function renderLines(lines: string[], key: number): React.ReactNode[] {
  return lines.map((line, lineIdx) => {
    const id = `${key}-${lineIdx}`;

    // Divider di tengah blok
    if (line.trim() === '---') {
      return <hr key={id} className="border-slate-200 dark:border-slate-800 my-2" />;
    }

    // Heading di tengah blok (mis. teks lalu "### Judul" dengan newline tunggal)
    const headingMatch = line.match(/^(#{2,6})\s+(.*)/);
    if (headingMatch) {
      const isH2 = headingMatch[1].length <= 2;
      return isH2 ? (
        <h3 key={id} className="font-extrabold text-base text-slate-900 dark:text-white pt-1">
          {headingMatch[2]}
        </h3>
      ) : (
        <h4
          key={id}
          className="font-bold text-sm text-indigo-700 dark:text-indigo-300 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800"
        >
          {headingMatch[2]}
        </h4>
      );
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li
          key={id}
          className="ml-4 list-disc text-slate-700 dark:text-slate-200 marker:text-indigo-500 text-xs leading-relaxed"
        >
          <span
            dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^[-*]\s+/, '')) }}
          />
        </li>
      );
    }

    if (/^\d+\.\s+/.test(line)) {
      const match = line.match(/^(\d+\.)\s+(.*)/);
      return (
        <div key={id} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-xs">
            {match?.[1]}
          </span>
          <span
            className="text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInline(match?.[2] || line) }}
          />
        </div>
      );
    }

    if (line.trim().length === 0) return null;

    return (
      <p
        key={id}
        className="text-xs leading-relaxed text-slate-700 dark:text-slate-200"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />
    );
  });
}

function renderParagraph(paragraph: string, key: number) {
  const lines = paragraph.split('\n');
  const firstLine = lines[0] ?? '';
  const restLines = lines.slice(1);

  // Heading. Hanya BARIS PERTAMA yang menjadi heading — sisa baris (bullet /
  // list bernomor yang dipisah newline tunggal oleh model) tetap dirender
  // sebagai konten, bukan ikut tertelan ke dalam judul.
  if (firstLine.startsWith('### ') || firstLine.startsWith('## ')) {
    const isSubHeading = firstLine.startsWith('### ');
    return (
      <div key={key} className="space-y-1.5">
        {isSubHeading ? (
          <h4 className="font-bold text-sm text-indigo-700 dark:text-indigo-300 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            {firstLine.replace(/^#+\s*/, '')}
          </h4>
        ) : (
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white pt-1">
            {firstLine.replace(/^#+\s*/, '')}
          </h3>
        )}
        {restLines.length > 0 && (
          <div className="space-y-1">{renderLines(restLines, key)}</div>
        )}
      </div>
    );
  }

  // Blockquote -> Disclaimer / pemberitahuan resmi
  if (firstLine.startsWith('>')) {
    const text = lines
      .map((l) => l.replace(/^>\s?/, ''))
      .join(' ')
      .trim();

    return (
      <div
        key={key}
        className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 my-2 space-y-1"
      >
        <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Pemberitahuan Resmi</span>
        </div>
        <p
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(text) }}
        />
      </div>
    );
  }

  // Divider
  if (paragraph.trim() === '---') {
    return <hr key={key} className="border-slate-200 dark:border-slate-800 my-2" />;
  }

  return (
    <div key={key} className="space-y-1">
      {renderLines(lines, key)}
    </div>
  );
}

interface ChatMessageContentProps {
  content: string;
  role: 'USER' | 'ASSISTANT';
  isError?: boolean;
}

export function ChatMessageContent({ content, role, isError }: ChatMessageContentProps) {
  if (role === 'USER') {
    return <p className="whitespace-pre-wrap text-xs leading-relaxed break-words">{content}</p>;
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 text-xs leading-relaxed text-rose-700 dark:text-rose-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
        <span className="break-words">{content}</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 leading-relaxed')}>
      {content
        .split(/\n{2,}/)
        .map((paragraph, pIdx) => renderParagraph(paragraph, pIdx))}
    </div>
  );
}
