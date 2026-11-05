/**
 * ============================================================================
 * markdown.tsx — Shared Markdown Renderer for AI Responses (Mimo & Miko)
 * ============================================================================
 *
 * Renderer aman & konsisten untuk seluruh balasan AI (chatbot publik Mimo,
 * AI Customer Miko, AI Assistant Admin Miko).
 *
 * PRINSIP KEAMANAN:
 *   - Menghasilkan React elements — TIDAK PERNAH memakai
 *     dangerouslySetInnerHTML, sehingga semua teks di-escape otomatis oleh
 *     React (aman dari HTML injection / XSS).
 *   - Tag HTML yang diizinkan (strong/b/em/i/code/br) dikonversi menjadi
 *     elemen setara; tag lain DIHAPUS dari tampilan (tidak pernah dieksekusi
 *     dan tidak pernah tampil mentah).
 *
 * FITUR:
 *   - **teks tebal** (dan <strong>) → <strong> (benar-benar tebal)
 *   - *miring* / <em>/<i> → <em>
 *   - `kode` / <code> → <code>
 *   - Heading ## / ### (dst) → h3/h4 (tanpa garis pemisah dekoratif)
 *   - List "- " / "* " / "1." → <ul>/<ol> yang valid
 *   - Tabel Markdown (| ... |) → <table> responsif (overflow-x-auto)
 *   - Blockquote "> ..." / disclaimer → kartu pemberitahuan amber
 *   - Garis horizontal "---" TIDAK dirender (aturan UI: tanpa divider
 *     dekoratif di dalam respons AI)
 * ============================================================================
 */

import React from 'react';

/* -------------------------------------------------------------------------- */
/* Inline parsing (tebal, miring, kode, HTML aman)                             */
/* -------------------------------------------------------------------------- */

/** Token inline: markdown maupun tag HTML yang diizinkan AI. */
const INLINE_TOKEN =
  /(\*\*[^*]+?\*\*|<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|<em>[\s\S]*?<\/em>|<i>[\s\S]*?<\/i>|<code>[\s\S]*?<\/code>|`[^`]+`|<br\s*\/?>|(?<=^|[\s(])\*(?!\*)[^*\n]+?\*(?=$|[\s).,;:!?])|(?<=^|[\s(])_[^_\n]+_(?=$|[\s).,;:!?]))/gi;

/** Hapus semua tag HTML dari teks biasa (tidak pernah dieksekusi). */
function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Parse isi inline menjadi React nodes (escape otomatis oleh React). */
function parseInline(text: string): React.ReactNode {
  if (!text) return '';
  const parts = text.split(INLINE_TOKEN);

  return parts.map((part, i) => {
    if (!part) return null;

    // **tebal** atau <strong>/<b>
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {parseInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (/^<(strong|b)>[\s\S]*?<\/\1>$/i.test(part)) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {parseInline(stripTags(part))}
        </strong>
      );
    }

    // *miring* atau <em>/<i>
    if (/^\*[^*]+\*$/.test(part)) {
      return (
        <em key={i} className="italic">
          {parseInline(part.slice(1, -1))}
        </em>
      );
    }
    if (/^<(em|i)>[\s\S]*?<\/\1>$/i.test(part)) {
      return (
        <em key={i} className="italic">
          {parseInline(stripTags(part))}
        </em>
      );
    }

    // _miring_ (gaya underscore) — token sudah dibatasi lookbehind/lookahead
    // sehingga snake_case (mis. TOOL_NOT_FOUND) tidak ikut tersentuh.
    if (/^_[^_\n]+_$/.test(part)) {
      return (
        <em key={i} className="italic">
          {parseInline(part.slice(1, -1))}
        </em>
      );
    }

    // `kode` atau <code>
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[12px] border border-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^<code>[\s\S]*?<\/code>$/i.test(part)) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[12px] border border-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700/60"
        >
          {stripTags(part)}
        </code>
      );
    }

    // <br> / <br/>
    if (/^<br\s*\/?>$/i.test(part)) {
      return <br key={i} />;
    }

    // Teks biasa — sisa tag HTML dihapus dari tampilan.
    return <React.Fragment key={i}>{stripTags(part)}</React.Fragment>;
  });
}

/* -------------------------------------------------------------------------- */
/* Block rendering                                                             */
/* -------------------------------------------------------------------------- */

const HEADING_CLASS: Record<number, string> = {
  1: 'font-extrabold text-base sm:text-lg text-slate-900 dark:text-white pt-1',
  2: 'font-extrabold text-base sm:text-lg text-slate-900 dark:text-white pt-1',
  3: 'font-bold text-sm sm:text-base text-indigo-600 dark:text-indigo-300 pt-1',
  4: 'font-bold text-sm sm:text-base text-indigo-600 dark:text-indigo-300 pt-1',
  5: 'font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide pt-1',
  6: 'font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide pt-1',
};

function renderHeading(level: number, text: string, key: number): React.ReactNode {
  const cls = HEADING_CLASS[Math.min(Math.max(level, 1), 6)] || HEADING_CLASS[4];
  if (level <= 2) {
    return (
      <h3 key={key} className={cls}>
        {parseInline(text)}
      </h3>
    );
  }
  if (level <= 4) {
    return (
      <h4 key={key} className={cls}>
        {parseInline(text)}
      </h4>
    );
  }
  return (
    <h5 key={key} className={cls}>
      {parseInline(text)}
    </h5>
  );
}

function renderDisclaimer(block: string, key: number): React.ReactNode {
  const text = block
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join(' ')
    .replace(/^(⚠️\s*)?(\*\*Disclaimer:?\*\*|Disclaimer:?)\s*:?\s*/i, '')
    .trim();

  return (
    <div
      key={key}
      className="p-3 rounded-xl bg-amber-50 border border-amber-200 my-1 space-y-1 shadow-inner dark:bg-amber-950/30 dark:border-amber-500/30"
    >
      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-600 dark:text-amber-400">
        <span>Pemberitahuan:</span>
      </div>
      <p className="text-xs leading-relaxed text-amber-700/90 dark:text-amber-200/90">
        {parseInline(text)}
      </p>
    </div>
  );
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function isTable(block: string): boolean {
  const lines = block.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return false;
  return lines[0].includes('|') && isSeparatorRow(lines[1]);
}

function renderTable(block: string, key: number): React.ReactNode {
  const lines = block.split('\n').filter((l) => l.trim());
  const hasSeparator = lines.length > 1 && isSeparatorRow(lines[1]);
  const header = splitRow(lines[0]);
  const body = (hasSeparator ? lines.slice(2) : lines.slice(1)).map(splitRow);

  return (
    <div key={key} className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-700/70">
      <table className="w-full text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800">
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap"
              >
                {parseInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr
              key={r}
              className={
                r % 2 === 0
                  ? 'bg-white dark:bg-slate-900/60'
                  : 'bg-slate-50 dark:bg-slate-800/40'
              }
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="px-3 py-2 border-t border-slate-200 text-slate-700 dark:border-slate-700/60 dark:text-slate-200"
                >
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LIST_ITEM_RE = /^([-*]|\d+\.)\s+(.*)$/;

function renderListBlock(block: string, key: number): React.ReactNode {
  const items = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(LIST_ITEM_RE);
      return m ? m[2] : l;
    });
  const ordered = /^\d+\./.test(block.trim().split('\n')[0].trim());
  const ListTag: React.ElementType = ordered ? 'ol' : 'ul';

  return (
    <ListTag
      key={key}
      className={`${
        ordered ? 'list-decimal' : 'list-disc'
      } pl-5 space-y-1 marker:text-indigo-500 dark:marker:text-indigo-400`}
    >
      {items.map((item, i) => (
        <li key={i} className="text-slate-700 dark:text-slate-200">
          {parseInline(item)}
        </li>
      ))}
    </ListTag>
  );
}

/** Blok campuran: heading di tengah, item list, dan paragraf biasa per baris. */
function renderMixedBlock(block: string, key: number): React.ReactNode {
  const lines = block.split('\n');
  const hasListLine = lines.some((l) => LIST_ITEM_RE.test(l.trim()));

  if (hasListLine) {
    // Kelompokkan item list berurutan; baris non-list tetap jadi paragraf.
    const children: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    let listOrdered = false;

    const flushList = (idx: number) => {
      if (listBuffer.length === 0) return;
      const ListTag: React.ElementType = listOrdered ? 'ol' : 'ul';
      children.push(
        <ListTag
          key={`${idx}-list`}
          className={`${
            listOrdered ? 'list-decimal' : 'list-disc'
          } pl-5 space-y-1 marker:text-indigo-500 dark:marker:text-indigo-400`}
        >
          {listBuffer.map((item, i) => (
            <li key={i} className="text-slate-700 dark:text-slate-200">
              {parseInline(item)}
            </li>
          ))}
        </ListTag>
      );
      listBuffer = [];
    };

    lines.forEach((rawLine, i) => {
      const line = rawLine.trim();
      const m = line.match(LIST_ITEM_RE);
      if (m) {
        if (listBuffer.length === 0) listOrdered = /^\d+\./.test(m[1]);
        listBuffer.push(m[2]);
        return;
      }
      flushList(i);
      if (!line) return;

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        children.push(renderHeading(heading[1].length, heading[2], i));
        return;
      }
      children.push(
        <p key={`p-${i}`} className="text-slate-700 dark:text-slate-200">
          {parseInline(line)}
        </p>
      );
    });
    flushList(999);

    return (
      <div key={key} className="space-y-1.5">
        {children}
      </div>
    );
  }

  return (
    <div key={key} className="space-y-1.5">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return null;
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) return renderHeading(heading[1].length, heading[2], i);
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) return null; // tanpa divider
        return (
          <p key={i} className="text-slate-700 dark:text-slate-200">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parse Markdown lengkap menjadi React nodes.
 * @param content Konten mentah dari AI (boleh memuat Markdown &/atau HTML aman).
 */
export function parseMarkdown(content: string): React.ReactNode {
  if (!content) return null;

  const blocks = content.split(/\n{2,}/);
  const nodes: React.ReactNode[] = [];

  blocks.forEach((rawBlock, idx) => {
    const block = rawBlock.trim();
    if (!block) return;

    // Garis horizontal dekoratif TIDAK dirender (kebijakan UI respons AI).
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(block)) return;

    // Disclaimer / blockquote.
    if (block.startsWith('>')) {
      nodes.push(renderDisclaimer(block, idx));
      return;
    }

    // Heading sebagai blok utuh.
    const heading = block.match(/^(#{1,6})\s+(.*)$/);
    if (heading && !block.includes('\n')) {
      nodes.push(renderHeading(heading[1].length, heading[2], idx));
      return;
    }

    // Tabel Markdown.
    if (isTable(block)) {
      nodes.push(renderTable(block, idx));
      return;
    }

    // List sebagai blok utuh (semua baris item list).
    const blockLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (blockLines.length > 0 && blockLines.every((l) => LIST_ITEM_RE.test(l))) {
      nodes.push(renderListBlock(block, idx));
      return;
    }

    // Blok campuran (heading/list/paragraf dalam satu blok).
    nodes.push(renderMixedBlock(block, idx));
  });

  if (nodes.length === 0) return null;

  return <div className="space-y-2 leading-relaxed">{nodes}</div>;
}

export default parseMarkdown;
