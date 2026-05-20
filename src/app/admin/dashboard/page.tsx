
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, BarChart3, Shield, Activity, Settings, 
  Layout, Database, ArrowUpRight, BrainCircuit, FileText
} from 'lucide-react';
import { getAllResults, analyzeResult } from '@/app/lib/actions';
import { StudentResult } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getAllResults();
      setResults(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleAnalyze = async (id: string) => {
    toast({ title: 'AI Анализ запущен', description: 'Вычисляем паттерны обучения...' });
    try {
      await analyzeResult(id);
      const updated = await getAllResults();
      setResults(updated);
      toast({ title: 'Успех', description: 'AI отчет успешно сформирован.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка анализа', description: 'Произошел сбой при генерации AI отчета.' });
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold text-[#081d3a]">Матрица go2study</h1>
          <p className="text-muted-foreground">Система управления диагностикой и AI-аналитикой.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/admin/tests')} className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7]">
            <Layout className="w-4 h-4 mr-2" /> Структура (Блоки и Время)
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/questions')} className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7]">
            <Database className="w-4 h-4 mr-2" /> Банк вопросов (Контент)
          </Button>
          <Button className="bg-[#14bf96] hover:bg-[#11a381]">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Активные сессии', val: results.filter(r => r.status === 'in_progress').length, icon: Activity, color: 'text-primary' },
          { label: 'Завершенные тесты', val: results.filter(r => r.status === 'completed').length, icon: Users, color: 'text-green-500' },
          { label: 'Ср. балл', val: results.length > 0 ? `${Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)}%` : '0%', icon: BarChart3, color: 'text-accent' },
          { label: 'Нарушения', val: results.reduce((acc, r) => acc + r.anti_cheat_count, 0), icon: Shield, color: 'text-destructive' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border-border shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold font-headline mt-1">{stat.val}</p>
              </div>
              <div className={`p-3 rounded-xl bg-background border border-border ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-headline flex items-center gap-2 text-xl text-[#081d3a]">
            <FileText className="w-5 h-5 text-primary" />
            Последние результаты
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Студент</TableHead>
                <TableHead>Город НИШ</TableHead>
                <TableHead>Результат</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>AI Анализ</TableHead>
                <TableHead className="text-right pr-6">Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    Записи отсутствуют.
                  </TableCell>
                </TableRow>
              ) : (
                results.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/10 transition-colors border-border/50">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#081d3a]">{r.student_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {r.class_number} Класс • {r.language === 'ru' ? 'Рус' : 'Каз'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.student_city}</TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{r.total_score}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({r.percentage}%)</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-bold ${getStatusColor(r.status)}`}>
                        {r.status === 'completed' ? 'Завершен' : 'В процессе'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.is_analysed ? (
                        <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] font-bold uppercase">Готов</Badge>
                      ) : r.status === 'completed' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleAnalyze(r.id)} className="text-accent hover:text-accent hover:bg-accent/10 h-7 text-[10px] font-bold uppercase tracking-wider">
                          <BrainCircuit className="w-3 h-3 mr-1" /> Анализ
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">Ожидание</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/results/${r.id}`)}>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
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
