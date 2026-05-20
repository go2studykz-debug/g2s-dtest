
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, BrainCircuit, Calendar, Zap, Clock, 
  MousePointer2, Search, TrendingUp, TrendingDown, Minus,
  Layout, Settings, ArrowUpRight, CheckCircle2, X
} from 'lucide-react';
import { getAllResults, analyzeResult, updateResultCRM } from '@/app/lib/actions';
import { StudentResult } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today_starts' | 'today_ready' | 'today_abandoned'>('all');
  const { toast } = useToast();
  const router = useRouter();

  const loadData = async () => {
    const data = await getAllResults();
    setResults(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = new Date().toLocaleDateString();

  const stats = useMemo(() => {
    const todayResults = results.filter(r => new Date(r.started_at).toLocaleDateString() === today);
    
    return {
      starts: todayResults.filter(r => r.status === 'in_progress').length,
      ready: todayResults.filter(r => r.status === 'completed' && r.is_analysed).length,
      abandoned: todayResults.filter(r => r.status === 'in_progress' && (new Date().getTime() - new Date(r.started_at).getTime() > 3600000)).length, 
      total_today: todayResults.length
    };
  }, [results, today]);

  const filteredResults = useMemo(() => {
    let list = results;
    if (filter !== 'all') {
      list = results.filter(r => {
        const isToday = new Date(r.started_at).toLocaleDateString() === today;
        if (!isToday) return false;
        if (filter === 'today_starts') return r.status === 'in_progress';
        if (filter === 'today_ready') return r.status === 'completed' && r.is_analysed;
        if (filter === 'today_abandoned') return r.status === 'in_progress';
        return true;
      });
    }
    return [...list].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [results, filter, today]);

  const handleAnalyze = async (id: string) => {
    toast({ title: 'AI Анализ запущен', description: 'Вычисляем паттерны обучения...' });
    try {
      await analyzeResult(id);
      await loadData();
      toast({ title: 'Успех', description: 'AI отчет успешно сформирован.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка анализа', description: 'Произошел сбой при генерации AI отчета.' });
    }
  };

  const handleCrmUpdate = async (id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) => {
    try {
      await updateResultCRM(id, updates);
      setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      toast({ title: 'Обновлено', description: 'Статус CRM изменен.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось обновить статус.' });
    }
  };

  const getPotentialBadge = (percentage: number) => {
    if (percentage >= 80) return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[11px] h-7 px-3 font-bold">
        <TrendingUp className="w-3.5 h-3.5" /> High Potential
      </Badge>
    );
    if (percentage >= 40) return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-[11px] h-7 px-3 font-bold">
        <Minus className="w-3.5 h-3.5" /> Medium
      </Badge>
    );
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 text-[11px] h-7 px-3 font-bold">
        <TrendingDown className="w-3.5 h-3.5" /> Hard Case
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6 md:p-10 space-y-8 text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-white text-primary border-primary/30 font-bold px-4 py-1.5 shadow-sm">
              <Calendar className="w-4 h-4 mr-1.5 text-primary" /> {today}
            </Badge>
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-[#081d3a]">Матрица go2study</h1>
          <p className="text-[#3b3e40] text-base mt-1 font-medium opacity-80">Панель оперативного управления лидами и AI-диагностики.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/admin/tests')} className="bg-[#14bf96] hover:bg-[#11a381] font-bold shadow-md h-12 px-6 rounded-xl transition-all hover:translate-y-[-2px]">
            <Layout className="w-5 h-5 mr-2" /> Управление обучением
          </Button>
          <Button variant="outline" className="border-[#081d3a] bg-white h-12 w-12 p-0 rounded-xl">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Виджеты воронки продаж */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { 
            label: 'Новые лиды (Старты)', 
            val: stats.starts, 
            sub: 'В процессе прямо сейчас',
            icon: Zap, 
            color: 'text-primary',
            bg: 'bg-primary/5',
            filter: 'today_starts'
          },
          { 
            label: 'Готовы к звонку', 
            val: stats.ready, 
            sub: 'Анализ завершен',
            icon: BrainCircuit, 
            color: 'text-green-500',
            bg: 'bg-green-500/5',
            filter: 'today_ready'
          },
          { 
            label: 'Нужна помощь', 
            val: stats.abandoned, 
            sub: 'Брошенные сессии',
            icon: Clock, 
            color: 'text-orange-500',
            bg: 'bg-orange-500/5',
            filter: 'today_abandoned'
          },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg border-2 rounded-2xl relative overflow-hidden",
              filter === stat.filter ? "border-primary shadow-md bg-white ring-4 ring-primary/5" : "border-transparent bg-white shadow-sm"
            )}
            onClick={() => setFilter(filter === stat.filter ? 'all' : stat.filter as any)}
          >
            <CardContent className="p-7 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#3b3e40] uppercase tracking-widest opacity-60">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-5xl font-bold font-headline">{stat.val}</p>
                </div>
                <p className="text-sm text-[#3b3e40] font-bold mt-1.5 opacity-70">{stat.sub}</p>
              </div>
              <div className={cn("p-5 rounded-2xl border border-border shadow-inner", stat.bg, stat.color)}>
                <stat.icon className="w-10 h-10" />
              </div>
            </CardContent>
            {filter === stat.filter && (
              <div className="bg-primary text-white text-[11px] font-black py-2 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                <MousePointer2 className="w-3.5 h-3.5" /> Активный фильтр
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-border bg-white shadow-xl rounded-2xl overflow-hidden border-none">
        <CardHeader className="py-6 px-8 flex flex-row items-center justify-between border-b bg-white">
          <div className="space-y-1">
            <CardTitle className="font-headline flex items-center gap-3 text-2xl font-bold">
              <Users className="w-7 h-7 text-primary" />
              {filter === 'all' ? 'Все результаты' : 'Отфильтрованные результаты'}
            </CardTitle>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[#3b3e40] uppercase font-bold tracking-widest opacity-60">
                Записей в списке: {filteredResults.length}
              </p>
              {filter !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                  Фильтр: {filter === 'today_starts' ? 'Старты' : filter === 'today_ready' ? 'Готовы' : 'Брошенные'}
                </Badge>
              )}
            </div>
          </div>
          {filter !== 'all' && (
            <Button 
              onClick={() => setFilter('all')} 
              className="bg-[#081d3a] hover:bg-[#0a264a] text-white font-bold rounded-xl h-11 px-6 shadow-md transition-all group"
            >
              <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> 
              Показать все результаты
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#f8fafc]">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-8 h-14 font-black uppercase text-[11px] w-[320px] tracking-widest text-[#3b3e40] opacity-50">Студент</TableHead>
                <TableHead className="h-14 font-black uppercase text-[11px] w-[220px] tracking-widest text-[#3b3e40] opacity-50">Квалификация</TableHead>
                <TableHead className="h-14 font-black uppercase text-[11px] w-[160px] tracking-widest text-[#3b3e40] opacity-50">AI Анализ</TableHead>
                <TableHead className="h-14 font-black uppercase text-[11px] text-center w-[120px] tracking-widest text-[#3b3e40] opacity-50">Связь</TableHead>
                <TableHead className="h-14 font-black uppercase text-[11px] text-center w-[120px] tracking-widest text-[#3b3e40] opacity-50">Конс.</TableHead>
                <TableHead className="h-14 text-right pr-8 font-black uppercase text-[11px] tracking-widest text-[#3b3e40] opacity-50">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-40 text-muted-foreground">
                    <div className="flex flex-col items-center gap-6">
                      <div className="p-6 rounded-full bg-muted/20">
                        <Search className="w-16 h-16 opacity-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-[#081d3a]">Ничего не найдено</p>
                        <p className="text-sm max-w-xs mx-auto">Попробуйте изменить параметры фильтрации или сбросить их.</p>
                      </div>
                      <Button variant="outline" onClick={() => setFilter('all')} className="rounded-xl font-bold">Вернуться ко всем</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((r) => (
                  <TableRow key={r.id} className="hover:bg-[#f4f7f9]/30 transition-colors border-b last:border-none group">
                    <TableCell className="pl-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-xl text-[#081d3a] leading-tight tracking-tight group-hover:text-primary transition-colors">{r.student_name}</span>
                        <div className="flex items-center gap-3 mt-2.5">
                          <Badge variant="secondary" className="text-[11px] h-6 font-bold bg-[#081d3a]/5 text-[#081d3a] px-3 rounded-md">{r.student_city}</Badge>
                          <span className="text-[12px] text-[#3b3e40] font-bold uppercase tracking-tight opacity-60">
                            {r.class_number} Класс • {r.language === 'ru' ? 'RU' : 'KK'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-black text-2xl text-primary">{r.percentage}%</span>
                          {getPotentialBadge(r.percentage)}
                        </div>
                        <p className="text-[11px] text-[#3b3e40] font-bold uppercase tracking-widest opacity-40">{r.total_score} баллов набрано</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.is_analysed ? (
                        <div className="flex items-center gap-2.5 text-green-600 font-black">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] uppercase tracking-widest">Готов</span>
                        </div>
                      ) : r.status === 'completed' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAnalyze(r.id)} 
                          className="h-9 text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all rounded-lg"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1.5" /> Анализ
                        </Button>
                      ) : (
                        <div className="text-[#3b3e40] text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 opacity-30">
                          <Clock className="w-4 h-4" /> В процессе
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={r.is_contacted} 
                        onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_contacted: !!checked })}
                        className="w-7 h-7 border-2 rounded-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={r.is_consulted} 
                        onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_consulted: !!checked })}
                        className="w-7 h-7 border-2 rounded-lg data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-all"
                      />
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/admin/results/${r.id}`)}
                        className="font-black text-xs gap-2 hover:bg-primary/10 hover:text-primary h-11 px-5 rounded-xl border border-transparent hover:border-primary/20 transition-all uppercase tracking-widest"
                      >
                        Детали <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

