'use client';

import React from 'react';
import katex from 'katex';

interface MathTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

function renderInline(text: string, baseKey: string): React.ReactNode[] {
  const regex = /(\*\*[\s\S]+?\*\*|\*[^*\n]+?\*|__[\s\S]+?__|~~[\s\S]+?~~|\^[^^]+?\^)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    const key = `${baseKey}-i${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith('__') && part.endsWith('__')) return <u key={key}>{part.slice(2, -2)}</u>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <s key={key}>{part.slice(2, -2)}</s>;
    if (part.startsWith('^') && part.endsWith('^')) return <sup key={key}>{part.slice(1, -1)}</sup>;
    return <span key={key}>{part}</span>;
  }).filter(Boolean) as React.ReactNode[];
}

function renderSegment(text: string, baseKey: string): React.ReactElement[] {
  const alignRegex = /(\[center\][\s\S]*?\[\/center\]|\[right\][\s\S]*?\[\/right\])/g;
  const parts = text.split(alignRegex);
  const result: React.ReactElement[] = [];
  parts.forEach((part, i) => {
    const key = `${baseKey}-s${i}`;
    if (!part) return;
    if (part.startsWith('[center]') && part.endsWith('[/center]')) {
      result.push(<div key={key} style={{ textAlign: 'center' }}>{renderInline(part.slice(8, -9), key)}</div>);
    } else if (part.startsWith('[right]') && part.endsWith('[/right]')) {
      result.push(<div key={key} style={{ textAlign: 'right' }}>{renderInline(part.slice(7, -8), key)}</div>);
    } else {
      result.push(<span key={key} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{renderInline(part, key)}</span>);
    }
  });
  return result;
}

// Negative lookahead (?!\d{1,3},) prevents matching currency like $2,000 or $3,500 as LaTeX.
// Valid math: $\dfrac{...}$, $x^2$, $49+c+38$, $3\dfrac{1}{2}$ — none have digit(s) immediately followed by comma.
const MATH_SPLIT_RE = /(\$\$[\s\S]+?\$\$|\$(?!\d{1,3},)[^$\n]+?\$)/g;

function renderMathText(text: string): React.ReactNode[] {
  const parts = text.split(MATH_SPLIT_RE);
  return parts.flatMap((part, i) => {
    const key = `m${i}`;
    if (!part) return [];
    if (part.startsWith('$$') && part.endsWith('$$')) {
      try {
        const html = katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false });
        return [<span key={key} dangerouslySetInnerHTML={{ __html: html }} />];
      } catch {
        return [<span key={key}>{part}</span>];
      }
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      try {
        const html = katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false });
        return [<span key={key} dangerouslySetInnerHTML={{ __html: html }} />];
      } catch {
        return [<span key={key}>{part}</span>];
      }
    }
    return renderSegment(part, key);
  }).filter(Boolean) as React.ReactNode[];
}

// Detects HTML tags OR HTML entities (&nbsp; &amp; etc.) so they render via dangerouslySetInnerHTML.
function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text) || /&[a-z]+;/i.test(text);
}

// Same currency-safe regex for math inside HTML content.
function processHtmlMath(html: string): string {
  return html.replace(/\$\$([^$]+)\$\$|\$(?!\d{1,3},)([^$\n]+)\$/g, (match, block, inline) => {
    try {
      if (block !== undefined) return katex.renderToString(block, { displayMode: true, throwOnError: false });
      if (inline !== undefined) return katex.renderToString(inline, { displayMode: false, throwOnError: false });
    } catch {}
    return match;
  });
}

export function MathText({ children, className, block }: MathTextProps) {
  if (!children) return null;
  if (isHtml(children)) {
    const Tag = block ? 'div' : 'span';
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: processHtmlMath(children) }} />;
  }
  const Tag = block ? 'div' : 'span';
  return <Tag className={className}>{renderMathText(children)}</Tag>;
}
