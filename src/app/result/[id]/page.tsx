'use client';

import React, { useEffect, useState, use } from 'react';
import { getResultDetail, getClassStats } from '@/app/lib/actions';
import { Trophy, Sparkles, TrendingUp, Target, CheckCircle2, AlertCircle, GraduationCap, Loader2 } from 'lucide-react';

interface ClassStats { count: number; avg: number; max: number; min: number; median: number; }

export default function ParticipantResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getResultDetail(id);
        if (!res || !res.result) { setNotFound(true); return; }
        setData(res);
        try {
          const s = await getClassStats(res.result.class_number, res.result.language, res.result.is_masterclass);
          if (s) setStats(s);
        } catch { /* comparison optional */ }
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9f7] via-white to-[#f0f4ff] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#14bf96] animate-spin" />
      </div>
    );
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9f7] via-white to-[#f0f4ff] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#081d3a]/40 mx-auto mb-3" />
          <p className="text-lg font-bold text-[#081d3a]">Результат не найден</p>
          <p className="text-sm text-[#3b3e40]/70 mt-1">Проверьте ссылку или обратитесь к менеджеру go2study.</p>
        </div>
      </div>
    );
  }

  const r = data.result;
  const analysis = r.ai_analysis?.analysis_json;
  const pct = r.total_score != null && r.max_score
    ? Math.round((r.total_score / r.max_score) * 100)
    : r.percentage ?? 0;
  const admission: { package: string; rangeMin: number; rangeMax: number }[] = analysis?.admissionChances ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f7] via-white to-[#f0f4ff]">
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 text-[#14bf96] font-bold text-xs uppercase tracking-[0.25em] mb-6">
          <Sparkles className="w-3.5 h-3.5" /> go2study · результат теста <Sparkles className="w-3.5 h-3.5" />
        </div>

        {/* Score hero */}
        <div className="bg-white rounded-3xl shadow-xl shadow-[#14bf96]/5 border border-[#14bf96]/10 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14bf96] to-[#0fa07e] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#14bf96]/25">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#081d3a]">{r.student_name}</h1>
          <p className="text-sm text-[#3b3e40]/70 mt-0.5">{r.class_number} класс · {r.language === 'kz' ? 'каз' : 'рус'}</p>
          <div className="mt-6 flex items-end justify-center gap-1">
            <span className="text-6xl font-extrabold text-[#14bf96] leading-none tabular-nums">{pct}</span>
            <span className="text-2xl font-bold text-[#14bf96]/60 mb-1">%</span>
          </div>
          <p className="text-sm text-[#3b3e40]/70 mt-2">{r.total_correct} из {r.total_questions} верных ответов</p>
        </div>

        {/* Comparison */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6 mt-4">
            <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-[#14bf96]" /> Сравнение с классом</h2>
            {[
              { label: 'Ты', v: pct, c: '#14bf96' },
              { label: 'Средний по классу', v: stats.avg, c: '#94a3b8' },
              { label: 'Лучший результат', v: stats.max, c: '#6366f1' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 mb-2.5">
                <span className="text-xs text-[#3b3e40]/70 w-36 shrink-0">{row.label}</span>
                <div className="flex-1 h-6 bg-[#f1f5f9] rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg flex items-center justify-end px-2" style={{ width: `${Math.max(row.v, 8)}%`, backgroundColor: row.c }}>
                    <span className="text-[11px] font-bold text-white tabular-nums">{row.v}%</span>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-[#3b3e40]/50 mt-2">Сравнение среди {stats.count} учеников {r.class_number} класса</p>
          </div>
        )}

        {/* Admission chances */}
        {admission.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6 mt-4">
            <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-4"><GraduationCap className="w-4 h-4 text-[#14bf96]" /> Шансы поступления в НИШ</h2>
            <div className="grid grid-cols-1 gap-2">
              {admission.map((a) => (
                <div key={a.package} className="flex items-center justify-between bg-[#f0f9f7] rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-[#081d3a]">{a.package}</span>
                  <span className="text-lg font-bold text-[#14bf96] tabular-nums">{a.rangeMin}–{a.rangeMax}%</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#3b3e40]/50 mt-3">Оценка шанса при подготовке по соответствующему пакету go2study.</p>
          </div>
        )}

        {/* AI analysis */}
        {analysis ? (
          <div className="mt-4 space-y-4">
            {analysis.performanceSummary && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6">
                <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-[#14bf96]" /> Главное</h2>
                <p className="text-sm text-[#3b3e40] leading-relaxed">{analysis.performanceSummary}</p>
              </div>
            )}
            {analysis.strongSides?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6">
                <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Сильные стороны</h2>
                <div className="space-y-2.5">
                  {analysis.strongSides.map((s: any, i: number) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <div><p className="text-sm font-semibold text-[#081d3a]">{s.direction}</p><p className="text-xs text-[#3b3e40]/80 mt-0.5">{s.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis.growthZones?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6">
                <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-amber-500" /> Зоны роста</h2>
                <div className="space-y-2.5">
                  {analysis.growthZones.map((z: any, i: number) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div><p className="text-sm font-semibold text-[#081d3a]">{z.zone}</p><p className="text-xs text-[#3b3e40]/80 mt-0.5">{z.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis.priorityDirections?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6">
                <h2 className="text-sm font-bold text-[#081d3a] flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-[#6366f1]" /> Что делать в первую очередь</h2>
                <div className="space-y-2.5">
                  {[...analysis.priorityDirections].sort((a: any, b: any) => (a.priority ?? 0) - (b.priority ?? 0)).map((p: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-xs font-bold flex items-center justify-center shrink-0">{p.priority ?? i + 1}</span>
                      <div><p className="text-sm font-semibold text-[#081d3a]">{p.direction}</p><p className="text-xs text-[#3b3e40]/80 mt-0.5">{p.justification}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis.conclusion && (
              <div className="bg-gradient-to-br from-[#14bf96] to-[#0fa07e] rounded-2xl p-6 text-white shadow-lg shadow-[#14bf96]/20">
                <p className="text-sm leading-relaxed font-medium">{analysis.conclusion}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#081d3a]/5 p-6 mt-4 text-center">
            <Loader2 className="w-6 h-6 text-[#14bf96] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#081d3a]">Подробный разбор готовится</p>
            <p className="text-xs text-[#3b3e40]/70 mt-1">Специалисты go2study формируют детальный анализ ошибок и рекомендации — скоро он появится здесь.</p>
          </div>
        )}

        <p className="text-center text-[11px] text-[#3b3e40]/40 mt-8">Персональный результат · go2study.kz</p>
      </div>
    </div>
  );
}
