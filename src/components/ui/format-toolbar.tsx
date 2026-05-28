'use client';

import React from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function FormatToolbar({ textareaRef, value, onChange, className }: FormatToolbarProps) {
  const wrap = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      // Нет выделения — вставляем внутрь [center]/[right] если есть, иначе весь текст
      const alignMatch = value.match(/^(\[(center|right)\])([\s\S]*)(\[\/(center|right)\])$/);
      if (alignMatch) {
        onChange(alignMatch[1] + before + alignMatch[3] + after + alignMatch[4]);
      } else {
        onChange(before + value + after);
      }
      setTimeout(() => el.focus(), 0);
    } else {
      const selected = value.slice(start, end);
      onChange(value.slice(0, start) + before + selected + after + value.slice(end));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, end + before.length);
      }, 0);
    }
  };

  const alignText = (tag: 'center' | 'right') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const target = start === end ? value : value.slice(start, end);
    const stripped = target.replace(/\[(center|right)\]([\s\S]*?)\[\/(center|right)\]/g, '$2');
    const wrapped = `[${tag}]${stripped}[/${tag}]`;
    onChange(start === end ? wrapped : value.slice(0, start) + wrapped + value.slice(end));
  };

  const removeAlign = () => {
    onChange(value.replace(/\[(center|right)\]([\s\S]*?)\[\/(center|right)\]/g, '$2'));
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className={cn("flex items-center gap-0.5 px-2 py-1 border border-input bg-muted/20 rounded-t-md border-b-0", className)}>
      <Btn onClick={() => wrap('**', '**')} title="Жирный"><Bold className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => wrap('*', '*')} title="Курсив"><Italic className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => wrap('__', '__')} title="Подчёркивание"><Underline className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => wrap('~~', '~~')} title="Зачёркивание"><Strikethrough className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => wrap('^', '^')} title="Верхний индекс"><span className="text-xs font-bold leading-none">x²</span></Btn>
      <div className="w-px h-4 bg-border mx-1" />
      <Btn onClick={removeAlign} title="По левому краю"><AlignLeft className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignText('center')} title="По центру"><AlignCenter className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignText('right')} title="По правому краю"><AlignRight className="w-3.5 h-3.5" /></Btn>
    </div>
  );
}
