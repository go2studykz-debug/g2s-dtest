'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

function markdownToHtml(text: string): string {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/\[center\]([\s\S]*?)\[\/center\]/g, '<div style="text-align:center">$1</div>')
    .replace(/\[right\]([\s\S]*?)\[\/right\]/g, '<div style="text-align:right">$1</div>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
    .replace(/\*([\s\S]+?)\*/g, '<i>$1</i>')
    .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
    .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>')
    .replace(/\^([^^]+?)\^/g, '<sup>$1</sup>');
}

export function WysiwygEditor({ value, onChange, placeholder, className, minHeight = '80px' }: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef('');

  useEffect(() => {
    const html = markdownToHtml(value);
    if (editorRef.current && html !== lastHtml.current) {
      editorRef.current.innerHTML = html;
      lastHtml.current = html;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtml.current = html;
      onChange(html);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand('insertText', false, text);
  }, []);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      lastHtml.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className={cn('border border-input rounded-md overflow-hidden', className)}>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-input bg-muted/20">
        <Btn onClick={() => exec('bold')} title="Жирный (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('italic')} title="Курсив (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('underline')} title="Подчёркивание (Ctrl+U)"><Underline className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('strikeThrough')} title="Зачёркивание"><Strikethrough className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('superscript')} title="Верхний индекс"><span className="text-xs font-bold leading-none">x²</span></Btn>
        <div className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => exec('justifyLeft')} title="По левому краю"><AlignLeft className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('justifyCenter')} title="По центру"><AlignCenter className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('justifyRight')} title="По правому краю"><AlignRight className="w-3.5 h-3.5" /></Btn>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        style={{ minHeight }}
        className="px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ring-inset"
        data-placeholder={placeholder}
      />
    </div>
  );
}
