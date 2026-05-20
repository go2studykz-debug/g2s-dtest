'use client';

import React, { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/badge";
import { Button as UIButton } from "@/components/ui/button";
import { 
  BrainCircuit, Shield, Clock, BookOpen, AlertCircle, 
  ChevronLeft, BarChart2, CheckCircle2, XCircle, Phone,
  Target, Zap, GraduationCap
} from 'lucide-react';
import { getResultDetail } from '@/app/lib/actions';
import { StudentResult, StudentAnswer, AntiCheatLog } from '@/app/lib/types';
import { useRouter } from 'next/navigation';

export default function ResultDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ result: StudentResult, answers: StudentAnswer[], logs: AntiCheatLog[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
                            <Badge variant="secondary" className="bg-red-50 text-red-600 border-none text-[9px] font-bold">{item.status}</Badge>
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
                  <UIButton onClick={() => router.refresh()} className="bg-[#14bf96] hover:bg-[#11a381] font-bold">Обновить данные</UIButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
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
        </div>
      </div>
    </div>
  );
}