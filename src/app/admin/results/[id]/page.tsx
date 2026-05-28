
'use client';

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as UIButton } from "@/components/ui/button";
import {
  BrainCircuit, Shield,
  ChevronLeft, BarChart2,
  Target, Zap, GraduationCap, ListChecks, History, Timer,
  FileDown, Loader2, Users
} from 'lucide-react';
import { getResultDetail, analyzeResult, clearAnalysis, getClassStats } from '@/app/lib/actions';
import { StudentResult, StudentAnswer, AntiCheatLog, Question } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, LineChart, Line, CartesianGrid,
} from 'recharts';

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Математика',
  quantitative: 'Кол. характеристики',
  logic: 'Логика',
  science: 'Естествознание',
  kazakh: 'Казахский язык',
  russian: 'Русский язык',
  english: 'Английский язык',
};
const subjectLabel = (s: string) => SUBJECT_LABELS[s] ?? s;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const TimeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 shadow text-xs space-y-0.5">
      <p className="font-bold text-[#081d3a]">Вопрос №{d.num} <span className="text-muted-foreground font-normal">({d.subject})</span></p>
      <p>Время: <span className="font-bold">{d.rawTime}с</span>{d.capped && <span className="text-orange-500 ml-1">(обрезан)</span>}</p>
      <p className={d.skipped ? 'text-gray-500' : d.isCorrect ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
        {d.skipped ? '— Пропущен' : d.isCorrect ? '✓ Верно' : '✗ Ошибка'}
      </p>
    </div>
  );
};

function computeSubjectScores(testQuestions: Question[], answers: StudentAnswer[], classNumber: number) {
  const getQPts = (q: Question) => {
    if (q.points) return q.points;
    if (classNumber === 6) return q.subject === 'quantitative' ? 10 : 20;
    return 10;
  };
  const qMap = new Map(testQuestions.map(q => [q.id, q]));
  const ssMap = new Map<string, { earned: number; max: number }>();
  for (const q of testQuestions) {
    const pts = getQPts(q);
    const e = ssMap.get(q.subject) || { earned: 0, max: 0 };
    e.max += pts;
    ssMap.set(q.subject, e);
  }
  for (const a of answers) {
    if (a.is_correct) {
      const q = qMap.get(a.question_id);
      if (q) {
        const e = ssMap.get(q.subject)!;
        e.earned += getQPts(q);
      }
    }
  }
  return Array.from(ssMap.entries()).map(([subject, { earned, max }]) => ({
    subject, earned, max, pct: max > 0 ? Math.round((earned / max) * 100) : 0,
  }));
}

export default function ResultDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ 
    result: StudentResult, 
    answers: StudentAnswer[], 
    logs: AntiCheatLog[],
    testQuestions: Question[]
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'analysis' | 'details' | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [classStats, setClassStats] = useState<{ count: number; avg: number; max: number; min: number; median: number; percentages: number[] } | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getResultDetail(id);
      setData(res as any);
      setLoading(false);
      if (res) {
        const stats = await getClassStats((res as any).result.class_number, (res as any).result.language);
        setClassStats(stats);
      }
    }
    load();
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeResult(id);
      const res = await getResultDetail(id);
      setData(res as any);
    } catch (e: any) {
      alert('Ошибка анализа: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = async (type: 'analysis' | 'details') => {
    if (!data) return;
    setDownloading(type);
    try {
      const subjectScores = computeSubjectScores(data.testQuestions, data.answers, data.result.class_number);
      const body = type === 'analysis'
        ? { type, result: data.result, analysis: data.result.ai_analysis?.analysis_json, subjectScores }
        : { type, result: data.result, answers: data.answers, questions: data.testQuestions, logs: data.logs };

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Server error');
      }

      const blob = await res.blob();
      const filename = type === 'analysis'
        ? `ai-analysis-${data.result.student_name}.pdf`
        : `test-details-${data.result.student_name}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('PDF error:', e?.message || e);
      alert('Ошибка генерации PDF: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setDownloading(null);
    }
  };

  if (loading || !data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  const { result, answers, logs, testQuestions } = data;
  const analysis = result.ai_analysis?.analysis_json;
  const subjectScores = computeSubjectScores(testQuestions, answers, result.class_number);

  const rawTimes = answers.map(a => a.time_spent_seconds).filter(t => t > 0).sort((a, b) => a - b);
  const p90 = rawTimes[Math.floor(rawTimes.length * 0.90)] ?? 120;
  const timeCapSec = Math.max(60, Math.min(p90, 120));

  const timeData = testQuestions.map(q => {
    const ans = answers.find(a => a.question_id === q.id);
    const t = ans?.time_spent_seconds ?? 0;
    const isCorrect = ans?.is_correct ?? false;
    const skipped = !ans?.student_answer;
    const capped = t > timeCapSec;
    const displayTime = capped ? timeCapSec : t;
    return {
      num: q.question_number,
      time: displayTime,
      rawTime: t,
      isCorrect,
      skipped,
      capped,
      subject: q.subject,
      color: skipped ? '#9ca3af' : t < 8 ? '#ef4444' : t <= 30 ? '#14bf96' : t <= 60 ? '#eab308' : '#8b5cf6',
    };
  });

  const scatterCorrect = timeData.filter(d => d.isCorrect).map(d => ({ x: Math.min(d.rawTime, timeCapSec), y: d.num, sub: d.subject, t: d.rawTime }));
  const scatterWrong = timeData.filter(d => !d.isCorrect && !d.skipped).map(d => ({ x: Math.min(d.rawTime, timeCapSec), y: d.num, sub: d.subject, t: d.rawTime }));
  const scatterSkipped = timeData.filter(d => d.skipped).map(d => ({ x: Math.min(d.rawTime, timeCapSec), y: d.num, sub: d.subject, t: d.rawTime }));

  const answerCounts = ['A', 'B', 'C', 'D', 'E'].map(opt => ({
    option: opt,
    correct: answers.filter(a => a.student_answer === opt && a.is_correct).length,
    wrong: answers.filter(a => a.student_answer === opt && !a.is_correct).length,
    total: answers.filter(a => a.student_answer === opt).length,
  })).filter(d => d.total > 0);

  let runCorrect = 0;
  const progressData = testQuestions.map((q, i) => {
    const ans = answers.find(a => a.question_id === q.id);
    if (ans?.is_correct) runCorrect++;
    return { num: q.question_number, pct: Math.round((runCorrect / (i + 1)) * 100) };
  });

  // ── Non-AI Trackers ──────────────────────────────────────────────────────────
  const timeCats = ['Наугад (<8с)', 'Быстро (8–20с)', 'Нормально (20–90с)', 'Затруднение (90–180с)', 'Очень долго (>180с)'];
  const getTimeCat = (s: number) => s < 8 ? 'Наугад (<8с)' : s < 20 ? 'Быстро (8–20с)' : s <= 90 ? 'Нормально (20–90с)' : s <= 180 ? 'Затруднение (90–180с)' : 'Очень долго (>180с)';
  const confidenceDist = timeCats.map(cat => {
    const inCat = answers.filter(a => getTimeCat(a.time_spent_seconds) === cat);
    const correct = inCat.filter(a => a.is_correct).length;
    return { cat, total: inCat.length, correct, acc: inCat.length ? Math.round((correct / inCat.length) * 100) : null };
  }).filter(d => d.total > 0);

  const speedGroups = [
    { label: 'Быстрые (<20с)', items: answers.filter(a => a.time_spent_seconds < 20) },
    { label: 'Нормальные (20–90с)', items: answers.filter(a => a.time_spent_seconds >= 20 && a.time_spent_seconds <= 90) },
    { label: 'Медленные (>90с)', items: answers.filter(a => a.time_spent_seconds > 90) },
  ].filter(g => g.items.length > 0).map(g => ({
    label: g.label,
    total: g.items.length,
    acc: Math.round((g.items.filter(a => a.is_correct).length / g.items.length) * 100),
  }));

  const subjectTimeMap: Record<string, number[]> = {};
  testQuestions.forEach(q => {
    const ans = answers.find(a => a.question_id === q.id);
    if (!ans) return;
    if (!subjectTimeMap[q.subject]) subjectTimeMap[q.subject] = [];
    subjectTimeMap[q.subject].push(ans.time_spent_seconds);
  });
  const subjectAvgTimes = Object.entries(subjectTimeMap).map(([subj, times]) => ({
    subj,
    avg: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
  }));

  const sortedByNum = [...testQuestions].sort((a, b) => a.question_number - b.question_number);
  const serialStreaks: { from: number; to: number; len: number; subj: string }[] = [];
  let streak: typeof sortedByNum = [];
  for (const q of sortedByNum) {
    const ans = answers.find(a => a.question_id === q.id);
    if (ans && !ans.is_correct) {
      streak.push(q);
    } else {
      if (streak.length >= 3) serialStreaks.push({ from: streak[0].question_number, to: streak[streak.length - 1].question_number, len: streak.length, subj: [...new Set(streak.map(q => q.subject))].join('+') });
      streak = [];
    }
  }
  if (streak.length >= 3) serialStreaks.push({ from: streak[0].question_number, to: streak[streak.length - 1].question_number, len: streak.length, subj: [...new Set(streak.map(q => q.subject))].join('+') });
  // ─────────────────────────────────────────────────────────────────────────────

  const computedTotalScore = subjectScores.reduce((s, sc) => s + sc.earned, 0);
  const effectiveMax = subjectScores.reduce((s, sc) => s + sc.max, 0) || result.max_score || 0;
  const totalPct = effectiveMax > 0 ? Math.round((computedTotalScore / effectiveMax) * 100) : 0;
  const ringR = 46;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc - (totalPct / 100) * ringCirc;
  const ringColor = totalPct >= 65 ? '#14bf96' : totalPct >= 40 ? '#f59e0b' : '#ef4444';

  const durationMs = result.completed_at && result.started_at
    ? new Date(result.completed_at as any).getTime() - new Date(result.started_at as any).getTime()
    : null;
  const durationMin = durationMs ? Math.floor(durationMs / 60000) : null;
  const dateStr = new Date(result.started_at as any).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6 md:p-10 space-y-10 max-w-7xl mx-auto text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <UIButton variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground hover:text-[#081d3a] -ml-2 font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </UIButton>
          <div>
            <h1 className="text-4xl font-headline font-bold text-[#081d3a]">{result.student_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-white text-primary border-primary/30 font-bold px-3 py-1">
                {result.class_number} Класс
              </Badge>
              <span className="text-sm font-bold text-[#3b3e40] opacity-60">
                {result.language.toUpperCase()} &bull; {result.student_city}
              </span>
              <span className="text-sm text-[#3b3e40] opacity-40">&bull;</span>
              <span className="text-sm text-[#3b3e40] opacity-60">{dateStr}</span>
              {durationMin && (
                <>
                  <span className="text-sm text-[#3b3e40] opacity-40">&bull;</span>
                  <span className="text-sm font-bold text-[#3b3e40] opacity-60 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> {durationMin} мин
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Anticheat banner */}
      {result.anti_cheat_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-700">
            Зафиксировано {result.anti_cheat_count} {result.anti_cheat_count === 1 ? 'нарушение' : result.anti_cheat_count < 5 ? 'нарушения' : 'нарушений'} прокторинга — ученик покидал вкладку во время теста.
          </p>
        </div>
      )}

      {/* Score Summary block */}
      {subjectScores.length > 0 && effectiveMax > 0 && (
        <Card className="border-[#e3e8ee] bg-white shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="shrink-0">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={ringR} fill="none" stroke="#f0f4f8" strokeWidth="10" />
                  <circle cx="60" cy="60" r={ringR} fill="none" stroke={ringColor} strokeWidth="10"
                    strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                  <text x="60" y="57" textAnchor="middle" style={{ fontSize: 24, fontWeight: 800, fill: '#081d3a' }}>{totalPct}%</text>
                  <text x="60" y="76" textAnchor="middle" style={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}>{computedTotalScore} / {effectiveMax} б.</text>
                </svg>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {subjectScores.map(({ subject, earned, max, pct }) => (
                  <div key={subject} className={cn("rounded-xl border px-3 py-2.5 flex flex-col items-center min-w-[80px]",
                    pct >= 65 ? "bg-green-50 border-green-200" : pct >= 40 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"
                  )}>
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{subjectLabel(subject)}</span>
                    <span className={cn("text-xl font-bold font-headline",
                      pct >= 65 ? "text-green-700" : pct >= 40 ? "text-orange-600" : "text-red-600"
                    )}>{pct}%</span>
                    <span className="text-[10px] text-muted-foreground">{earned}/{max}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* AI Analysis Section */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-[#081d3a] text-white py-6 px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 font-headline text-xl font-bold">
                    <GraduationCap className="w-7 h-7 text-[#14bf96]" />
                    AI Анализ go2study
                  </CardTitle>
                  <CardDescription className="text-white/60 mt-1">Методический анализ ошибок и стратегии подготовки.</CardDescription>
                </div>
                {analysis && (
                  <div className="flex gap-2 shrink-0">
                    <UIButton variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5 text-xs h-8 bg-transparent" onClick={async () => { if (confirm('Удалить AI анализ?')) { await clearAnalysis(id); const res = await getResultDetail(id); setData(res as any); } }} disabled={analyzing}>
                      Сбросить
                    </UIButton>
                    <UIButton variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5 text-xs h-8 bg-transparent" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" /> Анализ...</> : <><BrainCircuit className="w-3 h-3" /> Повторить</>}
                    </UIButton>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {analysis ? (
                <Tabs defaultValue="overview">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="overview">Обзор</TabsTrigger>
                    <TabsTrigger value="errors">Ошибки {analysis.detailedAnalysis?.length > 0 && `(${analysis.detailedAnalysis.length})`}</TabsTrigger>
                    <TabsTrigger value="strategy">Стратегия</TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Обзор */}
                  <TabsContent value="overview" className="space-y-8 mt-6">
                    <div className="bg-[#f0f9f7] border-l-4 border-[#14bf96] rounded-lg p-5">
                      <p className="text-base leading-relaxed font-medium">{analysis.performanceSummary}</p>
                    </div>

                    {(analysis.strongSides?.length > 0 || analysis.growthZones?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysis.strongSides?.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-green-600 flex items-center gap-2"><Zap className="w-4 h-4" /> Сильные стороны</h4>
                            {analysis.strongSides.map((item: any, i: number) => (
                              <div key={i} className="rounded-xl border border-green-100 bg-green-50 p-4">
                                <p className="text-sm font-bold text-green-700 mb-1">{item.direction}</p>
                                <p className="text-sm text-[#3b3e40] leading-relaxed">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {analysis.growthZones?.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-orange-600 flex items-center gap-2"><Target className="w-4 h-4" /> Зоны роста</h4>
                            {analysis.growthZones.map((item: any, i: number) => (
                              <div key={i} className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                                <p className="text-sm font-bold text-orange-700 mb-1">{item.zone}</p>
                                <p className="text-sm text-[#3b3e40] leading-relaxed">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {analysis.skillsMap?.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><ListChecks className="w-4 h-4" /> Карта навыков</h4>
                        <div className="space-y-3">
                          {analysis.skillsMap.map((item: any, i: number) => {
                            const isStrong = item.level === 'сильная зона';
                            const isMed = item.level === 'средняя зона';
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-[#081d3a]">{item.skill}</span>
                                  <span className={cn("font-bold text-[10px]", isStrong ? 'text-green-700' : isMed ? 'text-yellow-700' : 'text-red-600')}>{item.level}</span>
                                </div>
                                <div className="h-2 bg-[#f0f4f8] rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", isStrong ? 'bg-green-500' : isMed ? 'bg-yellow-400' : 'bg-red-400')} style={{ width: isStrong ? '88%' : isMed ? '52%' : '22%' }} />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>{item.subject}</span><span>{item.examImportance}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: Ошибки */}
                  <TabsContent value="errors" className="space-y-4 mt-6">
                    {analysis.detailedAnalysis?.map((item: any, i: number) => (
                      <div key={i} className="rounded-2xl border border-[#e3e8ee] overflow-hidden bg-white shadow-sm hover:border-primary/30 transition-all">
                        <div className="bg-[#f8fafc] px-5 py-3 border-b flex items-center justify-between">
                          <span className="font-bold text-xs text-[#081d3a] uppercase">Вопрос №{item.questionNumber} · {item.subject}</span>
                          <Badge variant="secondary" className={cn("text-[9px] font-bold border-none", item.status === 'Ошибка' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600")}>{item.status}</Badge>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                          <div>
                            <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Тема</p>
                            <p className="text-sm font-bold">{item.topic}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Тип ошибки</p>
                            <p className="text-sm font-bold text-red-500">{item.errorType}</p>
                          </div>
                          {item.timeCategory && (
                            <div>
                              <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Время</p>
                              <Badge variant="outline" className={cn("text-[10px] font-bold",
                                item.timeCategory?.includes('Наугад') ? "border-red-300 text-red-600 bg-red-50" :
                                item.timeCategory?.includes('Быстро') ? "border-orange-300 text-orange-600 bg-orange-50" :
                                item.timeCategory?.includes('Затруднение') ? "border-yellow-300 text-yellow-700 bg-yellow-50" :
                                item.timeCategory?.includes('Очень') ? "border-purple-300 text-purple-700 bg-purple-50" :
                                "border-gray-200 text-gray-500 bg-gray-50"
                              )}>{item.timeCategory}</Badge>
                            </div>
                          )}
                          {item.examInfluence && (
                            <div className={cn(item.timeCategory ? "" : "md:col-span-2")}>
                              <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Влияние на экзамен</p>
                              <p className="text-sm italic leading-relaxed text-[#3b3e40]">{item.examInfluence}</p>
                            </div>
                          )}
                          <div className="md:col-span-2 bg-orange-50 border border-orange-100 p-3 rounded-xl">
                            <p className="text-[9px] font-black text-orange-600 uppercase mb-1 tracking-widest">Рекомендация</p>
                            <p className="text-sm font-bold text-[#081d3a] leading-relaxed">{item.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* TAB 3: Стратегия */}
                  <TabsContent value="strategy" className="space-y-8 mt-6">
                    {analysis.strategyAnalysis && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><BrainCircuit className="w-4 h-4" /> Стратегия прохождения</h4>
                        <div className="bg-[#f8fafc] border border-[#e3e8ee] rounded-xl p-5">
                          <p className="text-sm leading-relaxed">{analysis.strategyAnalysis}</p>
                        </div>
                      </div>
                    )}

                    {(analysis.thinkingType || analysis.growthPotential) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysis.thinkingType && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><BrainCircuit className="w-4 h-4" /> Тип мышления</h4>
                            <div className="bg-[#f8fafc] border border-[#e3e8ee] rounded-xl p-5 h-full">
                              <p className="text-sm leading-relaxed">{analysis.thinkingType}</p>
                            </div>
                          </div>
                        )}
                        {analysis.growthPotential && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><Zap className="w-4 h-4" /> Потенциал роста</h4>
                            <div className="bg-[#f0f9f7] border border-[#14bf96]/30 rounded-xl p-5 h-full">
                              <p className="text-sm leading-relaxed">{analysis.growthPotential}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {analysis.priorityDirections?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><Zap className="w-4 h-4" /> Приоритеты подготовки</h4>
                        {analysis.priorityDirections.map((item: any, i: number) => (
                          <div key={i} className="flex gap-4 p-4 rounded-xl border border-[#e3e8ee] bg-[#f8fafc]">
                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-white text-[10px] font-black">{item.priority}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#081d3a]">{item.direction}</p>
                              <p className="text-sm text-[#3b3e40] mt-1 leading-relaxed">{item.justification}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.strategicDevelopment && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="w-4 h-4" /> План развития</h4>
                        <div className="bg-[#f8fafc] border border-[#e3e8ee] rounded-xl p-6 space-y-5">
                          <p className="text-sm font-medium leading-relaxed text-[#081d3a]">{analysis.strategicDevelopment.pointA}</p>
                          <div>
                            {analysis.strategicDevelopment.stages?.map((stage: any, i: number) => (
                              <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-[#081d3a] flex items-center justify-center shrink-0">
                                    <span className="text-white text-[9px] font-black">{i + 1}</span>
                                  </div>
                                  {i < (analysis.strategicDevelopment.stages.length - 1) && <div className="w-0.5 flex-1 bg-[#e3e8ee] my-1 min-h-[1rem]" />}
                                </div>
                                <div className="pb-4 pt-0.5">
                                  <div className="flex flex-wrap gap-2 items-center mb-1">
                                    <span className="text-xs font-black text-[#081d3a]">{stage.name}</span>
                                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary py-0">{stage.period}</Badge>
                                  </div>
                                  <p className="text-sm text-[#3b3e40] leading-relaxed">{stage.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-[#081d3a] text-white rounded-xl p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Целевой ориентир</p>
                            <p className="text-sm leading-relaxed">{analysis.strategicDevelopment.pointB}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {analysis.admissionChances?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Шансы на поступление</h4>
                        {analysis.admissionChances.map((item: any, i: number) => {
                          const isNoPrep = item.package === 'Без подготовки';
                          const isVip = item.package.includes('VIP');
                          const mid = (item.rangeMin + item.rangeMax) / 2;
                          return (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-[#081d3a]">{item.package}</span>
                                <span className={cn("text-sm font-bold font-headline", isNoPrep ? 'text-red-600' : isVip ? 'text-green-700' : 'text-yellow-700')}>{item.rangeMin}–{item.rangeMax}%</span>
                              </div>
                              <div className="h-3 bg-[#f0f4f8] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", isNoPrep ? 'bg-red-400' : isVip ? 'bg-green-500' : 'bg-yellow-400')} style={{ width: `${mid}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-[#3b3e40]/50 italic">Вероятностная оценка. Результат зависит от регулярности занятий.</p>
                      </div>
                    )}

                    {analysis.conclusion && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Заключение</h4>
                        <div className="bg-[#081d3a] text-white rounded-xl p-6">
                          <p className="text-sm leading-relaxed">{analysis.conclusion}</p>
                        </div>
                      </div>
                    )}

                    {analysis.antiCheatBehaviorAnalysis && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-red-600 flex items-center gap-2"><Shield className="w-4 h-4" /> Поведение (прокторинг)</h4>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                          <p className="text-sm leading-relaxed text-red-800">{analysis.antiCheatBehaviorAnalysis}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-4 bg-muted/5">
                  <BrainCircuit className="w-14 h-14 opacity-10" />
                  <p className="font-bold text-[#081d3a]">Анализ ещё не сформирован.</p>
                  <UIButton className="bg-[#14bf96] hover:bg-[#11a381] font-bold gap-2" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Анализируем... (~20 сек)</> : <><BrainCircuit className="w-4 h-4" /> Запустить AI анализ</>}
                  </UIButton>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Behavioral Analytics */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="py-6 px-8 border-b">
              <CardTitle className="flex items-center gap-3 font-headline text-xl font-bold">
                <BarChart2 className="w-7 h-7 text-primary" />
                Поведенческая аналитика
              </CardTitle>
              <CardDescription>Статистика по времени, паттернам ответов и прогрессии — вычислено без ИИ.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">

              {/* Time per question */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Время на каждый вопрос</h4>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-semibold text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /> &lt;8с — наугад</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#14bf96] shrink-0" /> 8–30с — норма</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" /> 30–60с — долго</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" /> &gt;60с — зависание</span>
                </div>
                {timeData.some(d => d.capped) && (
                  <p className="text-[10px] text-orange-500 font-medium -mt-1 mb-1">
                    * {timeData.filter(d => d.capped).length} вопр. с временем &gt;{timeCapSec}с обрезаны (ученик покидал вкладку)
                  </p>
                )}
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={timeData} barCategoryGap="15%">
                    <XAxis dataKey="num" tick={{ fontSize: 8 }} interval={Math.floor(timeData.length / 15)} />
                    <YAxis tick={{ fontSize: 8 }} unit="с" width={28} domain={[0, timeCapSec]} />
                    <Tooltip content={<TimeTooltip />} />
                    <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={1} />
                    <ReferenceLine y={30} stroke="#eab308" strokeDasharray="3 2" strokeWidth={1} />
                    <Bar dataKey="time" radius={[2, 2, 0, 0]}>
                      {timeData.map((d, i) => <Cell key={i} fill={d.capped ? '#f97316' : d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Answer distribution + Progression */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Распределение ответов (A–E)</h4>
                  <p className="text-[10px] text-muted-foreground">Перекос в одну букву указывает на угадывание</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart layout="vertical" data={answerCounts} margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" tick={{ fontSize: 8 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="option" tick={{ fontSize: 11, fontWeight: 700 }} width={18} />
                      <Tooltip formatter={(v: any, name: string) => [v, name === 'correct' ? 'Верно' : 'Ошибка']} />
                      <Bar dataKey="correct" name="correct" fill="#14bf96" stackId="a" />
                      <Bar dataKey="wrong" name="wrong" fill="#ef4444" stackId="a" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Прогрессия результатов</h4>
                  <p className="text-[10px] text-muted-foreground">% верных ответов нарастающим итогом</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={progressData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="num" tick={{ fontSize: 8 }} interval={Math.floor(progressData.length / 8)} />
                      <YAxis tick={{ fontSize: 8 }} unit="%" domain={[0, 100]} width={30} />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Результат']} />
                      <ReferenceLine y={result.percentage} stroke="#081d3a" strokeDasharray="3 3" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="pct" stroke="#14bf96" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scatter: time vs question */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Матрица: время × вопрос</h4>
                <div className="flex gap-5 text-[10px] font-semibold text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#14bf96] shrink-0" /> Верно</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /> Ошибка</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" /> Пропуск</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" dataKey="x" name="Время" unit="с" tick={{ fontSize: 8 }} domain={[0, timeCapSec]} label={{ value: `Время (сек, макс ${timeCapSec}с)`, position: 'insideBottom', offset: -10, fontSize: 8, fill: '#6b7280' }} />
                    <YAxis type="number" dataKey="y" name="Вопрос" tick={{ fontSize: 8 }} reversed domain={[1, testQuestions.length]} label={{ value: 'Вопрос №', angle: -90, position: 'insideLeft', offset: 15, fontSize: 8, fill: '#6b7280' }} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow text-xs">
                          <p className="font-bold">Вопрос №{d.y} <span className="font-normal text-muted-foreground">({d.sub})</span></p>
                          <p className="font-semibold">{d.t}с</p>
                        </div>
                      );
                    }} />
                    <ReferenceLine x={8} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '8с', fontSize: 7, fill: '#ef4444', position: 'insideTopLeft' }} />
                    <ReferenceLine x={30} stroke="#eab308" strokeDasharray="4 2" label={{ value: '30с', fontSize: 7, fill: '#b45309', position: 'insideTopLeft' }} />
                    <Scatter data={scatterCorrect} fill="#14bf96" fillOpacity={0.85} />
                    <Scatter data={scatterWrong} fill="#ef4444" fillOpacity={0.85} />
                    <Scatter data={scatterSkipped} fill="#9ca3af" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Tracker: Confidence Distribution */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Распределение уверенности
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {confidenceDist.map(d => {
                    const color = d.cat.includes('Наугад') ? 'bg-red-50 border-red-200 text-red-700' : d.cat.includes('Быстро') ? 'bg-orange-50 border-orange-200 text-orange-700' : d.cat.includes('Нормально') ? 'bg-green-50 border-green-200 text-green-700' : d.cat.includes('Затруднение') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-purple-50 border-purple-200 text-purple-700';
                    return (
                      <div key={d.cat} className={cn('rounded-xl border p-3', color)}>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{d.cat}</p>
                        <p className="text-xl font-bold font-headline">{d.total} отв.</p>
                        <p className="text-xs font-bold opacity-80">точность {d.acc}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tracker: Speed vs Accuracy */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Скорость vs Точность
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {speedGroups.map(g => (
                    <div key={g.label} className="rounded-xl border border-[#e3e8ee] bg-[#f8fafc] p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{g.label}</p>
                      <p className="text-xl font-bold font-headline text-[#081d3a]">{g.acc}%</p>
                      <p className="text-xs text-muted-foreground">{g.total} вопросов</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracker: Avg Time per Subject */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Среднее время по предметам
                </h4>
                <div className="flex flex-wrap gap-2">
                  {subjectAvgTimes.map(({ subj, avg }) => (
                    <div key={subj} className={cn('rounded-xl border px-3 py-2 flex items-center gap-2',
                      avg < 20 ? 'bg-green-50 border-green-200' : avg < 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                    )}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{subjectLabel(subj)}</span>
                      <span className={cn('text-sm font-bold font-headline', avg < 20 ? 'text-green-700' : avg < 60 ? 'text-yellow-700' : 'text-red-600')}>{avg}с</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracker: Serial Errors */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <History className="w-4 h-4" /> Серийные ошибки (3+ подряд)
                </h4>
                {serialStreaks.length === 0 ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 font-bold">Серийных ошибок не обнаружено.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {serialStreaks.map((s, i) => (
                      <div key={i} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-center gap-2">
                        <span className="text-sm font-bold text-red-700 font-headline">{s.subj.split('+').map(subjectLabel).join(' + ')}</span>
                        <span className="text-[9px] font-black uppercase text-red-400">{s.from}–{s.to} вопр.</span>
                        <span className="text-[9px] text-muted-foreground">{s.len} подряд</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Full Questions Breakdown Table */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-8 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <ListChecks className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle className="font-headline text-base font-bold">Полный список ответов</CardTitle>
                  <CardDescription className="text-xs">{testQuestions.length} вопросов · {answers.filter(a => a.is_correct).length} верных</CardDescription>
                </div>
              </div>
              <UIButton variant="outline" size="sm" className="font-bold text-xs gap-2 shrink-0" onClick={() => setShowQuestions(v => !v)}>
                {showQuestions ? 'Скрыть' : 'Показать'}
              </UIButton>
            </CardHeader>
            {showQuestions && <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#f8fafc]">
                  <TableRow>
                    <TableHead className="pl-8 w-16">№</TableHead>
                    <TableHead>Предмет / Вопрос</TableHead>
                    <TableHead className="w-32">Ответ ученика</TableHead>
                    <TableHead className="w-32">Правильный ответ</TableHead>
                    <TableHead className="w-32 text-right pr-8">Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testQuestions.map((q) => {
                    const ans = answers.find(a => a.question_id === q.id);
                    return (
                      <TableRow key={q.id} className="hover:bg-muted/30 group">
                        <TableCell className="pl-8 font-bold text-muted-foreground">{q.question_number}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">{subjectLabel(q.subject)}</span>
                            <span className="text-sm font-medium line-clamp-1">{q.question_text}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ans ? (
                            <Badge variant="outline" className={cn(
                              "font-bold",
                              ans.is_correct ? "border-green-200 text-green-700 bg-green-50" : "border-red-200 text-red-700 bg-red-50"
                            )}>
                              {ans.student_answer}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Пропуск</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold border-primary/20 text-primary">
                            {q.correct_answer}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-mono text-sm">
                          {ans ? formatTime(ans.time_spent_seconds) : "0:00"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>}
          </Card>
        </div>

        <div className="space-y-8 sticky top-6">
          {/* Sidebar Controls */}
          <Card className="border-[#e3e8ee] bg-[#081d3a] text-white shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-50">Контроль сессии</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-40">WhatsApp Родителя</p>
                <p className="text-xl font-bold text-[#14bf96]">{result.parent_whatsapp}</p>
              </div>
              <div className="pt-6 border-t border-white/10">
                 <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-2">Нарушения прокторинга</p>
                 <div className="flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full ${result.anti_cheat_count > 0 ? 'bg-red-500 animate-pulse' : 'bg-[#14bf96]'}`} />
                   <span className="text-2xl font-bold">{result.anti_cheat_count}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Comparison */}
          {classStats && classStats.count > 1 && (() => {
            const rank = classStats.percentages.filter(p => p < result.percentage).length + 1;
            const rankFromTop = classStats.count - rank + 1;
            const delta = result.percentage - classStats.avg;
            const isAbove = delta >= 0;
            const bar = (val: number) => `${Math.round((val / 100) * 100)}%`;
            return (
              <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="py-4 px-6 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#081d3a]">
                    <Users className="w-4 h-4 text-primary" /> Сравнение с классом
                  </CardTitle>
                  <CardDescription className="text-xs">{classStats.count} учеников · {result.class_number} кл. {result.language.toUpperCase()}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-headline text-[#081d3a]">{rankFromTop}</p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">место из {classStats.count}</p>
                    </div>
                    <div className="text-center">
                      <p className={cn("text-2xl font-bold font-headline", isAbove ? "text-green-600" : "text-red-600")}>
                        {isAbove ? '+' : ''}{delta}%
                      </p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">vs среднее</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Этот ученик', val: result.percentage, color: 'bg-[#14bf96]' },
                      { label: 'Среднее', val: classStats.avg, color: 'bg-blue-400' },
                      { label: 'Лучший', val: classStats.max, color: 'bg-purple-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                          <span>{label}</span><span>{val}%</span>
                        </div>
                        <div className="h-1.5 bg-[#f0f4f8] rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", color)} style={{ width: bar(val) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: 'Мин.', val: classStats.min },
                      { label: 'Медиана', val: classStats.median },
                      { label: 'Макс.', val: classStats.max },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-lg border border-[#e3e8ee] bg-[#f8fafc] p-2 text-center">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold text-[#081d3a]">{val}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* PDF Export */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Экспорт PDF</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <UIButton
                className="w-full bg-[#081d3a] hover:bg-[#0a2547] text-white font-bold h-11 gap-2"
                onClick={() => handleDownloadPdf('analysis')}
                disabled={!analysis || downloading !== null}
              >
                {downloading === 'analysis'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерация...</>
                  : <><FileDown className="w-4 h-4" /> AI Анализ (PDF)</>}
              </UIButton>
              <UIButton
                className="w-full bg-white border-2 border-[#081d3a] text-[#081d3a] hover:bg-[#f9fafb] font-bold h-11 gap-2"
                onClick={() => handleDownloadPdf('details')}
                disabled={downloading !== null}
              >
                {downloading === 'details'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерация...</>
                  : <><FileDown className="w-4 h-4" /> Детали теста (PDF)</>}
              </UIButton>
              {!analysis && <p className="text-[10px] text-muted-foreground text-center italic">Для AI анализа сначала запустите анализ</p>}
            </CardContent>
          </Card>

          {/* Anti-cheat logs */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-6 border-b bg-red-50/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <Shield className="w-4 h-4" /> Журнал прокторинга
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic">Нарушений не зафиксировано</div>
              ) : (
                <div className="divide-y">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 space-y-2 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 bg-red-50 uppercase">
                          {log.event_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold leading-tight">{log.details}</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><History className="w-3 h-3" /> Вопрос №{log.question_number}</span>
                        {log.exit_duration_seconds > 0 && (
                          <span className="flex items-center gap-1 text-red-500"><Timer className="w-3 h-3" /> {formatTime(log.exit_duration_seconds)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
