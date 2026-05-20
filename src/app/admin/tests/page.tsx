
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit2, ChevronLeft, Layout, 
  Clock, BookOpen, Trash2, Filter
} from 'lucide-react';
import { getTests } from '@/app/lib/actions';
import { Test, Language } from '@/app/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';

export default function TestsManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [selectedLang, setSelectedLang] = useState<Language | 'all'>('all');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getTests();
      setTests(data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredTests = tests.filter(test => {
    const matchClass = selectedClass === 'all' || test.class_number === selectedClass;
    const matchLang = selectedLang === 'all' || test.language === selectedLang;
    return matchClass && matchLang;
  });

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground -ml-2 h-8">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </Button>
          <h1 className="text-3xl font-headline font-bold text-[#081d3a]">Структура Тестов</h1>
        </div>
        <Button onClick={() => router.push('/admin/tests/new')} className="bg-[#14bf96] hover:bg-[#11a381]">
          <Plus className="w-4 h-4 mr-2" /> Создать тест
        </Button>
      </header>

      {/* Фильтры в стиле go2study */}
      <div className="flex flex-wrap items-center gap-10 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> Класс
          </span>
          <div className="flex gap-2">
            {['all', 4, 5, 6].map(c => (
              <button
                key={c}
                onClick={() => setSelectedClass(c as any)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold transition-all border-2",
                  selectedClass === c 
                    ? "bg-[#081d3a] text-white border-[#081d3a]" 
                    : "bg-white text-[#081d3a] border-[#e3e8ee] hover:border-[#081d3a]"
                )}
              >
                {c === 'all' ? 'Все' : `${c} класс`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> Язык
          </span>
          <div className="flex gap-2">
            {['all', 'ru', 'kk'].map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang as any)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold transition-all border-2",
                  selectedLang === lang 
                    ? "bg-[#14bf96] text-white border-[#14bf96]" 
                    : "bg-white text-[#081d3a] border-[#e3e8ee] hover:border-[#081d3a]"
                )}
              >
                {lang === 'all' ? 'Все' : lang === 'ru' ? 'Русский' : 'Казахский'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="border-border bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-headline flex items-center gap-2 text-xl text-[#081d3a]">
            <Layout className="w-5 h-5 text-primary" />
            Список активных конфигураций
          </CardTitle>
          <CardDescription>Здесь вы настраиваете блоки предметов, лимиты времени и классы.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Название</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead>Язык</TableHead>
                <TableHead>Блоки (Предметы)</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right pr-6">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">Загрузка...</TableCell></TableRow>
              ) : filteredTests.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">Тесты с такими параметрами не найдены.</TableCell></TableRow>
              ) : (
                filteredTests.map((test) => (
                  <TableRow key={test.id} className="hover:bg-muted/5 border-border/50">
                    <TableCell className="pl-6 font-bold text-[#081d3a]">{test.name}</TableCell>
                    <TableCell><Badge variant="outline" className="border-border">{test.class_number} Класс</Badge></TableCell>
                    <TableCell className="uppercase font-bold text-xs text-muted-foreground">{test.language}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {test.blocks.map((b, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] bg-primary/10 text-primary border-none font-bold uppercase">
                            {b.subject}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                        <Clock className="w-3 h-3 text-primary" /> {test.blocks.reduce((acc, b) => acc + b.time_limit_minutes, 0)}м
                      </span>
                    </TableCell>
                    <TableCell>
                      {test.is_active ? (
                        <span className="text-green-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Активен
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Черновик</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/tests/${test.id}`)} className="text-primary hover:bg-primary/5 font-bold h-8">
                        <Edit2 className="w-3.5 h-3.5 mr-2" /> Настроить
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
