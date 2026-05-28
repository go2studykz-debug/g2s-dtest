'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Home, Star, Trophy, Sparkles } from 'lucide-react';

export default function CompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f7] via-white to-[#f0f4ff] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8 animate-in zoom-in-95 duration-500">

        {/* Trophy icon */}
        <div className="relative inline-flex">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#14bf96] to-[#0fa07e] flex items-center justify-center shadow-2xl shadow-[#14bf96]/30">
            <Trophy className="w-14 h-14 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-[#14bf96]/30 rounded-full animate-ping" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#14bf96] font-bold text-sm uppercase tracking-[0.2em] mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Тест завершён</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#081d3a] leading-tight">
            Ты большой молодец!
          </h1>
        </div>

        {/* Motivational message */}
        <div className="space-y-4 text-[#3b3e40]">
          <p className="text-xl font-medium leading-relaxed">
            🎉 Первый шаг в поступлении в НИШ уже сделан — и это самое важное!
          </p>
          <p className="text-base leading-relaxed text-[#3b3e40]/80">
            Ты показал свои знания, и теперь наши специалисты go2study изучат твои результаты
            и свяжутся с вами в ближайшее время с подробным анализом и рекомендациями.
          </p>
          <div className="bg-gradient-to-r from-[#f0f9f7] to-[#f0f4ff] rounded-2xl p-6 border border-[#14bf96]/20 text-left space-y-3">
            {[
              ['🏆', 'Ты наш будущий чемпион — мы верим в тебя!'],
              ['📊', 'Скоро ты получишь детальный разбор каждой ошибки.'],
              ['🚀', 'Вместе с go2study путь в НИШ станет намного яснее!'],
            ].map(([emoji, text]) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{emoji}</span>
                <p className="text-sm font-medium text-[#081d3a]/80 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white rounded-2xl border border-[#e3e8ee] p-5 text-sm text-muted-foreground leading-relaxed shadow-sm">
          Ваш тест успешно отправлен и проходит обработку системой оценки go2study.
          Мы с вами свяжемся в ближайшее время — ожидайте звонка!
        </div>

        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="h-12 px-8 border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold text-base rounded-xl"
        >
          <Home className="w-4 h-4 mr-2" />
          Вернуться на главную
        </Button>

        <p className="text-xs text-muted-foreground">
          go<strong>2</strong>study · Подготовка к НИШ
        </p>
      </div>
    </div>
  );
}
