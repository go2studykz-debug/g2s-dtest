
'use client';

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as UIButton } from "@/components/ui/button";
import { 
  BrainCircuit, Shield, Clock, BookOpen, AlertCircle, 
  ChevronLeft, BarChart2, CheckCircle2, XCircle, Phone,
  Target, Zap, GraduationCap, ListChecks, History, Timer
} from 'lucide-react';
import { getResultDetail } from '@/app/lib/actions';
import { StudentResult, StudentAnswer, AntiCheatLog, Question } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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

  const { result, answers, logs, testQuestions } = data;
  const analysis = result.ai_analysis?.analysis_json;

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6 md:p-10 space-y-10 max-w-7xl mx-auto text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <UIButton variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground hover:text-[#081d3a] -ml-2 font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </UIButton>
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
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* AI Analysis Section */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-[#081d3a] text-white py-6 px-8">
              <CardTitle className="flex items-center gap-3 font-headline text-xl font-bold">
                <GraduationCap className="w-7 h-7 text-[#14bf96]" />
                Аналитический отчет НИШ (AI go2study)
              </CardTitle>
              <CardDescription className="text-white/60">Глубокий методический анализ ошибок и влияния на экзамен.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              {analysis ? (
                <>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" /> Общая сводка
                    </h4>
                    <p className="text-base leading-relaxed font-medium">{analysis.performanceSummary}</p>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                      <Target className="w-4 h-4" /> Детализация по ошибкам ( NIS Format )
                    </h4>
                    <div className="space-y-6">
                      {analysis.detailedAnalysis?.map((item: any, i: number) => (
                        <div key={i} className="rounded-2xl border border-[#e3e8ee] overflow-hidden bg-white shadow-sm hover:border-primary/30 transition-all">
                          <div className="bg-[#f8fafc] px-6 py-3 border-b flex items-center justify-between">
                            <span className="font-bold text-xs text-[#081d3a] uppercase">Вопрос №{item.questionNumber} ({item.subject})</span>
                            <Badge variant="secondary" className={cn(
                              "text-[9px] font-bold border-none",
                              item.status === 'Ошибка' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                            )}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                              <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Тема задания</p>
                              <p className="text-sm font-bold">{item.topic}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Тип ошибки</p>
                              <p className="text-sm font-bold text-red-500">{item.errorType}</p>
                            </div>
                            <div className="md:col-span-2 pt-4 border-t border-dashed">
                              <p className="text-[9px] font-black uppercase text-[#3b3e40]/40 mb-1 tracking-widest">Влияние на экзамен</p>
                              <p className="text-sm font-medium italic leading-relaxed text-[#3b3e40]">{item.examInfluence}</p>
                            </div>
                            <div className="md:col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                              <p className="text-[9px] font-black text-orange-600 uppercase mb-1 tracking-widest">Рекомендация эксперта</p>
                              <p className="text-sm font-bold text-[#081d3a] leading-relaxed">{item.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-4 bg-muted/5">
                  <BrainCircuit className="w-16 h-16 opacity-10" />
                  <p className="font-bold text-[#081d3a]">Анализ еще не сформирован.</p>
                  <UIButton className="bg-[#14bf96] hover:bg-[#11a381] font-bold" onClick={() => window.location.reload()}>Обновить данные</UIButton>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Questions Breakdown Table */}
          <Card className="border-[#e3e8ee] bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="py-6 px-8 border-b">
              <CardTitle className="flex items-center gap-3 font-headline text-xl font-bold">
                <ListChecks className="w-7 h-7 text-primary" />
                Полный список ответов
              </CardTitle>
              <CardDescription>Детальный разбор каждого вопроса сессии.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">{q.subject}</span>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
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
