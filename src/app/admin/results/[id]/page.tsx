
'use client';

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, Shield, Clock, BookOpen, AlertCircle, 
  ChevronLeft, BarChart2, CheckCircle2, XCircle, Phone
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
    'second_lang': 'Второй язык'
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground hover:text-foreground -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </Button>
          <div>
            <h1 className="text-4xl font-headline font-bold">{result.student_name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              {result.class_number} Класс &bull; {result.language.toUpperCase()} &bull; {result.student_city}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 py-3 flex flex-col items-center">
              <span className="text-xs font-bold text-primary uppercase tracking-tighter">Результат</span>
              <span className="text-3xl font-bold font-headline">{result.percentage}%</span>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 py-3 flex flex-col items-center">
              <span className="text-xs font-bold text-accent uppercase tracking-tighter">Баллы</span>
              <span className="text-3xl font-bold font-headline">{result.total_score}</span>
            </CardContent>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border bg-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-primary">
                <Brain className="w-5 h-5" />
                AI Диагностический отчет
              </CardTitle>
              <CardDescription>Генеративный анализ паттернов ошибок и траектория развития.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {analysis ? (
                <>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" /> Сводка производительности
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/90">{analysis.performanceSummary}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-accent" /> Пути обучения (Suggestions)
                    </h4>
                    <div className="grid gap-3">
                      {analysis.learningPathwaySuggestions.map((s: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border">
                          <span className="text-xs font-bold text-accent uppercase">{s.area}</span>
                          <p className="text-sm mt-1">{s.suggestion}</p>
                          {s.resources && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {s.resources.map((r: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px]">{r}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-4">
                  <BrainCircuit className="w-12 h-12 opacity-20" />
                  <p>AI анализ еще не был сгенерирован для этого результата.</p>
                  <Button variant="secondary" size="sm" onClick={() => router.refresh()}>Обновить страницу</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-headline font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" /> Хронология вопросов
            </h3>
            <div className="space-y-3">
              {answers.map((a, i) => (
                <Card key={i} className="bg-secondary/20 border-border overflow-hidden">
                  <div className={`h-1 w-full ${a.is_correct ? 'bg-green-500' : 'bg-destructive'}`} />
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${a.is_correct ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                        {a.question_number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">{SUBJECT_MAP[a.subject] || a.subject}</span>
                        <span className="text-sm font-medium">Ваш ответ: {a.student_answer || 'Пропущен'} | Правильно: {a.correct_answer}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-muted-foreground">{a.time_spent_seconds}с</span>
                      {a.is_correct ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-border bg-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-destructive">
                <Shield className="w-5 h-5" />
                Контроль честности
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 rounded-xl bg-secondary/50 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Всего нарушений</p>
                <p className={`text-5xl font-bold font-headline ${result.anti_cheat_count > 0 ? 'text-destructive' : 'text-green-500'}`}>
                  {result.anti_cheat_count}
                </p>
              </div>

              {logs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Лог активности</p>
                  <div className="space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-3 text-sm p-3 rounded-lg bg-background border border-border">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-xs uppercase">{log.event_type === 'tab_switch' ? 'Смена вкладки' : 'Потеря фокуса'}</p>
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Вопрос {log.question_number} &bull; {new Date(log.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-secondary/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Контактная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> WhatsApp Родителя
                </p>
                <p className="font-medium text-primary">{result.parent_whatsapp}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Начало сессии</p>
                <p className="font-medium">{new Date(result.started_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Продолжительность</p>
                <p className="font-medium">
                  {result.completed_at ? 
                    `${Math.round((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 60000)} минут` : 
                    'Активно'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
