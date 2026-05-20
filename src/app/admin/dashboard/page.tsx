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
import { Input } from "@/components/ui/input";
import { 
  Users, BrainCircuit, Calendar, Zap, Clock, 
  MousePointer2, Search, TrendingUp, TrendingDown, Minus,
  Layout, ArrowUpRight, X, Phone, CalendarDays, AlertTriangle
} from 'lucide-react';
import { getAllResults, getTests, analyzeResult, updateResultCRM } from '@/app/lib/actions';
import { StudentResult, Test } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [testDurations, setTestDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today_starts' | 'today_ready' | 'today_abandoned' | 'today_no_consult' | 'all_completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    loadData();
    // Refresh data every minute to update "abandoned" status accurately
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [resultsData, testsData] = await Promise.all([
        getAllResults(),
        getTests()
      ]);
      
      const durations: Record<string, number> = {};
      testsData.forEach(t => {
        durations[t.id] = t.total_time_minutes;
      });
      
      setTestDurations(durations);
      setResults(resultsData);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    if (!mounted) return '';
    return new Date().toLocaleDateString();
  }, [mounted]);

  // Helper to check if session is abandoned (in progress > test time limit)
  const isAbandoned = (r: StudentResult) => {
    if (r.status !== 'in_progress') return false;
    const startTime = new Date(r.started_at).getTime();
    const now = new Date().getTime();
    const limitMinutes = testDurations[r.test_id] || 60; // Fallback to 60 min
    const limitMs = limitMinutes * 60000;
    
    // Test is abandoned if current time exceeds started_at + time limit
    return (now - startTime) > limitMs;
  };

  const stats = useMemo(() => {
    if (!mounted) return { starts: 0, ready: 0, abandoned: 0, noConsult: 0, total_today: 0 };
    
    const todayResults = results.filter(r => new Date(r.started_at).toLocaleDateString() === todayStr);
    
    return {
      starts: todayResults.filter(r => r.status === 'in_progress' && !isAbandoned(r)).length,
      ready: todayResults.filter(r => r.status === 'completed' && r.is_analysed).length,
      abandoned: todayResults.filter(r => isAbandoned(r)).length, 
      noConsult: todayResults.filter(r => r.status === 'completed' && !r.is_consulted).length,
      total_today: todayResults.length
    };
  }, [results, todayStr, mounted, testDurations]);

  const filteredResults = useMemo(() => {
    let list = results;

    if (!mounted) return list;

    // Filter by type
    if (filter !== 'all') {
      list = results.filter(r => {
        const isToday = new Date(r.started_at).toLocaleDateString() === todayStr;
        
        if (filter === 'all_completed') return r.status === 'completed';
        
        if (!isToday) return false;
        if (filter === 'today_starts') return r.status === 'in_progress' && !isAbandoned(r);
        if (filter === 'today_ready') return r.status === 'completed' && r.is_analysed;
        if (filter === 'today_abandoned') return isAbandoned(r);
        if (filter === 'today_no_consult') return r.status === 'completed' && !r.is_consulted;
        return true;
      });
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.student_name.toLowerCase().includes(term) || 
        r.parent_whatsapp.toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [results, filter, todayStr, searchTerm, mounted, testDurations]);

  const handleAnalyze = async (id: string) => {
    toast({ title: 'AI Анализ запущен', description: 'Вычисляем паттерны обучения...' });
    try {
      await analyzeResult(id);
      await loadData();
      toast({ title: 'Успех', description: 'Анализ завершен успешно.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка анализа', description: 'Не удалось сгенерировать отчет ИИ.' });
    }
  };

  const handleCrmUpdate = async (id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) => {
    try {
      await updateResultCRM(id, updates);
      setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      toast({ title: 'Обновлено', description: 'CRM статус успешно изменен.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Сбой при обновлении статуса.' });
    }
  };

  const getPotentialBadge = (percentage: number) => {
    if (percentage >= 80) return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-[10px] h-6 px-2 font-black uppercase tracking-tight">
        <TrendingUp className="w-3 h-3" /> High Potential
      </Badge>
    );
    if (percentage >= 40) return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-[10px] h-6 px-2 font-black uppercase tracking-tight">
        <Minus className="w-3 h-3" /> Medium
      </Badge>
    );
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 text-[10px] h-6 px-2 font-black uppercase tracking-tight">
        <TrendingDown className="w-3 h-3" /> Hard Case
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-6 md:p-10 space-y-8 text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-white text-primary border-primary/30 font-bold px-4 py-1.5 shadow-sm">
              <Calendar className="w-4 h-4 mr-1.5 text-primary" /> Сегодня: {mounted ? todayStr : '--.--.----'}
            </Badge>
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-[#081d3a]">Матрица go2study</h1>
          <p className="text-[#3b3e40] text-base mt-1 font-medium opacity-80">Оперативный центр управления лидами и AI-диагностики.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/admin/tests')} className="bg-[#14bf96] hover:bg-[#11a381] font-bold shadow-md h-12 px-6 rounded-xl transition-all hover:translate-y-[-2px]">
            <Layout className="w-5 h-5 mr-2" /> Конфигурация тестов
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Новые лиды (Старты)', 
            val: stats.starts, 
            sub: 'В процессе',
            icon: Zap, 
            color: 'text-primary',
            bg: 'bg-primary/5',
            filter: 'today_starts'
          },
          { 
            label: 'Готовы к звонку', 
            val: stats.ready, 
            sub: 'AI готов',
            icon: BrainCircuit, 
            color: 'text-green-500',
            bg: 'bg-green-500/5',
            filter: 'today_ready'
          },
          { 
            label: 'Конс. не назначена', 
            val: stats.noConsult, 
            sub: 'Нужно связаться',
            icon: Phone, 
            color: 'text-blue-500',
            bg: 'bg-blue-500/5',
            filter: 'today_no_consult'
          },
          { 
            label: 'Нужна помощь', 
            val: stats.abandoned, 
            sub: 'Брошенные',
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
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-[#3b3e40] uppercase tracking-widest opacity-40">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-4xl font-bold font-headline">{mounted ? stat.val : '0'}</p>
                </div>
                <p className="text-sm text-[#3b3e40] font-bold mt-1 opacity-70">{stat.sub}</p>
              </div>
              <div className={cn("p-4 rounded-xl border border-border shadow-inner", stat.bg, stat.color)}>
                <stat.icon className="w-8 h-8" />
              </div>
            </CardContent>
            {filter === stat.filter && (
              <div className="bg-primary text-white text-[10px] font-black py-1.5 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                <MousePointer2 className="w-3 h-3" /> Активный фильтр
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск по имени или WhatsApp..." 
            className="pl-10 h-12 bg-white border-border rounded-xl shadow-sm focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {filter !== 'all' && (
          <Button 
            onClick={() => setFilter('all')} 
            variant="outline"
            className="bg-white border-primary text-primary hover:bg-primary/5 font-bold rounded-xl h-12 px-6 shadow-sm transition-all group"
          >
            <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> 
            Сбросить фильтры
          </Button>
        )}
      </div>

      <Card className="border-none bg-white shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="py-6 px-8 flex flex-row items-center justify-between border-b bg-white">
          <div className="space-y-1">
            <CardTitle className="font-headline flex items-center gap-3 text-2xl font-bold text-[#081d3a]">
              <Users className="w-7 h-7 text-primary" />
              Список результатов
            </CardTitle>
            <p className="text-[10px] text-[#3b3e40] uppercase font-black tracking-widest opacity-40">
              Найдено записей: {filteredResults.length}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#f8fafc]">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="pl-8 h-14 font-black uppercase text-[10px] w-[320px] tracking-widest text-[#3b3e40] opacity-40">Студент / Контакты</TableHead>
                <TableHead className="h-14 font-black uppercase text-[10px] w-[200px] tracking-widest text-[#3b3e40] opacity-40">Результат</TableHead>
                <TableHead className="h-14 font-black uppercase text-[10px] w-[200px] tracking-widest text-[#3b3e40] opacity-40">Статус завершения</TableHead>
                <TableHead className="h-14 font-black uppercase text-[10px] text-center w-[100px] tracking-widest text-[#3b3e40] opacity-40">Связь</TableHead>
                <TableHead className="h-14 font-black uppercase text-[10px] text-center w-[100px] tracking-widest text-[#3b3e40] opacity-40">Конс.</TableHead>
                <TableHead className="h-14 text-right pr-8 font-black uppercase text-[10px] tracking-widest text-[#3b3e40] opacity-40">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-40">
                    <div className="flex flex-col items-center gap-6">
                      <Search className="w-16 h-16 opacity-5" />
                      <p className="text-xl font-bold text-[#081d3a] opacity-30">Ничего не найдено</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((r) => {
                  const abandoned = isAbandoned(r);
                  return (
                    <TableRow key={r.id} className="hover:bg-[#f4f7f9]/50 transition-colors border-b last:border-none group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-lg text-[#14bf96] leading-tight tracking-tight">{r.student_name}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[9px] h-4.5 font-bold bg-[#f1f3f5] text-[#3b3e40] px-2 rounded-sm border-none">
                              {r.student_city}
                            </Badge>
                            <span className="text-[10px] text-[#3b3e40] font-black uppercase tracking-tighter opacity-40 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {r.parent_whatsapp}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-xl text-[#081d3a]">{r.percentage}%</span>
                            {getPotentialBadge(r.percentage)}
                          </div>
                          <p className="text-[10px] text-[#3b3e40] font-black uppercase tracking-widest opacity-30">{r.total_score} баллов &bull; {r.class_number} Класс</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {mounted && r.completed_at ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#081d3a] flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                                {new Date(r.completed_at).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-black uppercase text-[#3b3e40] opacity-40 ml-5">
                                {new Date(r.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : abandoned && mounted ? (
                            <div className="text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 bg-red-50 px-2 py-1 rounded w-fit">
                              <AlertTriangle className="w-3.5 h-3.5" /> Брошен
                            </div>
                          ) : !r.completed_at && mounted ? (
                            <div className="text-[#3b3e40] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-20">
                              <Clock className="w-3.5 h-3.5" /> В процессе
                            </div>
                          ) : (
                            <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={r.is_contacted} 
                            onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_contacted: !!checked })}
                            className="w-6 h-6 border-[#e3e8ee] rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={r.is_consulted} 
                            onCheckedChange={(checked) => handleCrmUpdate(r.id, { is_consulted: !!checked })}
                            className="w-6 h-6 border-[#e3e8ee] rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-3">
                          {!r.is_analysed && r.status === 'completed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleAnalyze(r.id)} 
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full"
                              title="Запустить AI Анализ"
                            >
                              <Zap className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push(`/admin/results/${r.id}`)}
                            className="font-bold text-[10px] gap-1 hover:text-primary transition-all uppercase tracking-widest"
                          >
                            Детали <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
