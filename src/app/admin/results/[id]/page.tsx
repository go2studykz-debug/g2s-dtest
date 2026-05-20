'use client';

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, Shield, Clock, BookOpen, AlertCircle, 
  ChevronLeft, BarChart2, CheckCircle2, XCircle, Phone,
  BrainCircuit
} from 'lucide-react';
import { getResultDetail } from '@/app/lib/actions';
import { StudentResult, StudentAnswer, AntiCheatLog } from '@/app/lib/types';
import { useRouter } from 'next/navigation';

export default function ResultDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ result: StudentResult, answers: StudentAnswer[], logs: AntiCheatLog[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getResultDetail(id);
      setData(res as any);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading || !data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  const { result, answers, logs } = data;
  const analysis = result.ai_analysis?.analysis_json;

  const SUBJECT_MAP: Record<string, string> = {
    'math': 'Математика',
    'logic': 'Логика',
    'english': 'Английский',
    'second_lang': 'Второй язык',
    'quantitative': 'Кол. хар.',
    'science': 'Естествознание'
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6 md:p-10 space-y-10 max-w-7xl mx-auto text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground hover:text-[#081d3a] -ml-2 font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold text-[#081d3a]">{result.student_name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="bg-white text-primary border-primary/30 font-bold px-3 py-1">
                {result.class_number} Класс
              </Badge>
              <span className="text-sm font-bold text-[#3b3e40] opacity-60">
                {result.language.toUpperCase()} &bull; {result.student_city}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Card className="bg-white border-[#e3e8ee] shadow-sm">
            <CardContent className="p-5 py-4 flex flex-col items-center">
              <span className="text-[10px] font-black text-[#3b3e40] uppercase tracking-widest opacity-40">Результат</span>
              <span className="text-3xl font-bold font-headline text-[#14bf96]">{result.percentage}%</span>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#e3e8ee] shadow-sm">
            <CardContent className="p-5 py-4 flex flex-col items-center">
              <span className="text-[10px] font-black text-[#3b3e40] uppercase tracking-widest opacity-40">Баллы</span>
              <span className="text-3xl font-bold font-headline text-[#081d3a]">{result.total_score}</span>
            </CardContent>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-[#f8fafc] py-6 px-8">
              <CardTitle className="flex items-center gap-3 font-headline text-[#081d3a] text-xl font-bold">
                <BrainCircuit className="w-7 h-7 text-[#14bf96]" />
                AI Диагностический отчет
              </CardTitle>
              <CardDescription className="font-medium text-[#3b3e40] opacity-60">Генеративный анализ паттернов обучения на базе ИИ.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {analysis ? (
                <>
                  <div className="p-6 rounded-2xl bg-[#f0f9f7] border border-[#14bf96]/10">
                    <h4 className="font-bold text-[#14bf96] mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <BarChart2 className="w-4 h-4" /> Сводка производительности
                    </h4>
                    <p className="text-base leading-relaxed text-[#081d3a] font-medium">{analysis.performanceSummary}</p>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-[#3b3e40]">
                      <BookOpen className="w-4 h-4 text-[#14bf96]" /> Рекомендации по развитию
                    </h4>
                    <div className="grid gap-4">
                      {analysis.learningPathwaySuggestions.map((s: any, i: number) => (
                        <div key={i} className="p-6 rounded-2xl bg-white border border-[#e3e8ee] hover:shadow-md transition-shadow">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{s.area}</span>
                          <p className="text-base mt-2 font-medium text-[#081d3a]">{s.suggestion}</p>
                          {s.resources && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {s.resources.map((r: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-bold bg-[#f1f3f5] text-[#3b3e40] border-none px-3">
                                  {r}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-4 bg-muted/5">
                  <BrainCircuit className="w-16 h-16 opacity-10" />
                  <p className="font-bold text-[#081d3a]">AI анализ еще не сформирован.</p>
                  <Button onClick={() => router.refresh()} className="bg-[#14bf96] hover:bg-[#11a381] font-bold">
                    Обновить данные
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-headline font-bold flex items-center gap-3 text-[#081d3a]">
              <Clock className="w-6 h-6 text-[#14bf96]" /> Детализация по вопросам
            </h3>
            <div className="space-y-3">
              {answers.map((a, i) => (
                <Card key={i} className="bg-white border-[#e3e8ee] shadow-sm overflow-hidden hover:border-[#14bf96]/30 transition-colors">
                  <div className={`h-1.5 w-full ${a.is_correct ? 'bg-[#14bf96]' : 'bg-red-400'}`} />
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${a.is_correct ? 'bg-[#f0f9f7] text-[#14bf96]' : 'bg-red-50 text-red-500'}`}>
                        #{a.question_number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#3b3e40] uppercase font-black tracking-widest opacity-40">{SUBJECT_MAP[a.subject] || a.subject}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-[#081d3a]">Ответ: {a.student_answer || 'Пропущен'}</span>
                          <span className="text-xs text-[#3b3e40] font-medium opacity-60">&bull; Правильно: {a.correct_answer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3b3e40] opacity-30">Время</span>
                        <span className="text-sm font-bold font-mono text-[#081d3a]">{a.time_spent_seconds}с</span>
                      </div>
                      {a.is_correct ? (
                        <CheckCircle2 className="w-6 h-6 text-[#14bf96]" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-[#e3e8ee] bg-white shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-red-50/50 border-b border-red-100">
              <CardTitle className="flex items-center gap-3 font-headline text-red-500 text-lg font-bold">
                <Shield className="w-5 h-5" />
                Контроль честности
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center p-6 rounded-2xl bg-[#f8fafc] border border-[#e3e8ee]">
                <p className="text-[10px] font-black text-[#3b3e40] uppercase tracking-widest opacity-40 mb-2">Нарушений зафиксировано</p>
                <p className={`text-6xl font-bold font-headline ${result.anti_cheat_count > 0 ? 'text-red-500' : 'text-[#14bf96]'}`}>
                  {result.anti_cheat_count}
                </p>
              </div>

              {logs.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#3b3e40] uppercase tracking-widest opacity-40">Журнал активности</p>
                  <div className="space-y-3">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border border-[#e3e8ee]">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-[#081d3a]">{log.event_type === 'tab_switch' ? 'Смена вкладки' : 'Потеря фокуса'}</p>
                          <p className="text-xs text-[#3b3e40] font-medium opacity-60 mt-1">Вопрос #{log.question_number} &bull; {new Date(log.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#e3e8ee] bg-[#081d3a] text-white shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-50">Контактные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-40 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> WhatsApp Родителя
                </p>
                <p className="text-xl font-bold text-[#14bf96]">{result.parent_whatsapp}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Начало</p>
                  <p className="text-xs font-bold">{new Date(result.started_at).toLocaleTimeString()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Длительность</p>
                  <p className="text-xs font-bold">
                    {result.completed_at ? 
                      `${Math.round((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 60000)} мин.` : 
                      'Активно'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}