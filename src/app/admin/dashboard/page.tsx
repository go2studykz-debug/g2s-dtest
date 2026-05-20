
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
  Users, Shield, BrainCircuit, Calendar, Zap, Clock, 
  MousePointer2, Search, TrendingUp, TrendingDown, Minus,
  Layout, Settings, ArrowUpRight, Phone, CheckCircle2
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
      abandoned: todayResults.filter(r => r.status === 'in_progress').length, 
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
    // Сортировка: сначала новые
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
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[9px] h-5">
        <TrendingUp className="w-3 h-3" /> High Potential
      </Badge>
    );
    if (percentage >= 40) return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-[9px] h-5">
        <Minus className="w-3 h-3" /> Medium
      </Badge>
    );
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 text-[9px] h-5">
        <TrendingDown className="w-3 h-3" /> Hard Case
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 space-y-8 text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-white text-primary border-primary/20 font-bold">
              <Calendar className="w-3 h-3 mr-1" /> {today}
            </Badge>
          </div>
          <h1 className="text-4xl font-headline font-bold">Матрица go2study</h1>
          <p className="text-muted-foreground text-sm">Панель оперативного управления лидами и AI-диагностики.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/admin/tests')} className="bg-[#14bf96] hover:bg-[#11a381] font-bold shadow-sm h-11">
            <Layout className="w-4 h-4 mr-2" /> Управление обучением
          </Button>
          <Button variant="outline" className="border-[#081d3a] bg-white h-11">
            <Settings className="w-4 h-4" />
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
              "cursor-pointer transition-all hover:shadow-md border-2",
              filter === stat.filter ? "border-primary shadow-sm" : "border-transparent bg-white shadow-sm"
            )}
            onClick={() => setFilter(filter === stat.filter ? 'all' : stat.filter as any)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-bold font-headline">{stat.val}</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">{stat.sub}</p>
              </div>
              <div className={cn("p-4 rounded-2xl border border-border", stat.bg, stat.color)}>
                <stat.icon className="w-8 h-8" />
              </div>
            </CardContent>
            {filter === stat.filter && (
              <div className="bg-primary text-white text-[10px] font-bold py-1 text-center uppercase tracking-widest flex items-center justify-center gap-1">
                <MousePointer2 className="w-3 h-3" /> Фильтр активен
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-border bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-center justify-between border-b bg-muted/5">
          <div className="space-y-1">
            <CardTitle className="font-headline flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-primary" />
              {filter === 'all' ? 'Все результаты' : 'Отфильтрованные лиды'}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Найдено записей: {filteredResults.length}</p>
          </div>
          {filter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('all')} className="text-xs font-bold uppercase text-primary">
              Сбросить фильтр
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 font-bold uppercase text-[10px] w-[220px]">Студент</TableHead>
                <TableHead className="font-bold uppercase text-[10px] w-[180px]">Квалификация</TableHead>
                <TableHead className="font-bold uppercase text-[10px] w-[120px]">AI Отчет</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-center w-[100px]">Связался</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-center w-[100px]">Конс.</TableHead>
                <TableHead className="text-right pr-6 font-bold uppercase text-[10px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-10 h-10 opacity-10" />
                      <p className="font-medium">По вашему запросу ничего не найдено.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/5 transition-colors border-border/50">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{r.student_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-[#081d3a]/5">{r.student_city}</Badge>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {r.class_number} Класс • {r.language === 'ru' ? 'Рус' : 'Каз'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-primary">{r.percentage}%</span>
                          {getPotentialBadge(r.percentage)}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{r.total_score} баллов</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.is_analysed ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Готов</span>
                        </div>
                      ) : r.status === 'completed' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleAnalyze(r.id)} 
                          className="h-7 text-[9px] font-bold uppercase tracking-wider border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10"
                        >
                          <Zap className="w-3 h-3 mr-1" /> Анализ
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[9px] italic flex items-center gap-1">
                          <Clock className="w-3 h-3" /> В тесте
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={r.is_contacted} 
                        onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_contacted: !!checked })}
                        className="data-[state=checked]:bg-primary border-primary/30"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={r.is_consulted} 
                        onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_consulted: !!checked })}
                        className="data-[state=checked]:bg-green-500 border-green-500/30"
                      />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/admin/results/${r.id}`)}
                        className="font-bold text-xs gap-1 hover:bg-primary/10 hover:text-primary h-8"
                      >
                        Детали <ArrowUpRight className="w-3.5 h-3.5" />
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
