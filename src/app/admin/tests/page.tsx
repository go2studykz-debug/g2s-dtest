
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
  Plus, BookOpen, Clock, Globe, GraduationCap, 
  ChevronLeft, Edit2, Layout
} from 'lucide-react';
import { getTests } from '@/app/lib/actions';
import { Test } from '@/app/lib/types';

export default function TestsManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getTests();
      setTests(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground -ml-2 h-8">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </Button>
          <h1 className="text-4xl font-headline font-bold text-[#081d3a]">Управление тестами</h1>
          <p className="text-muted-foreground">Создание, редактирование и настройка диагностических тестов.</p>
        </div>
        <Button onClick={() => router.push('/admin/tests/new')} className="bg-[#14bf96] hover:bg-[#11a381]">
          <Plus className="w-4 h-4 mr-2" /> Создать тест
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Всего тестов</p>
              <p className="text-2xl font-bold font-headline">{tests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Языки</p>
              <p className="text-2xl font-bold font-headline">RU / KK</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Классы</p>
              <p className="text-2xl font-bold font-headline">4, 5, 6</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-white shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            Активные тесты
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Название</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead>Язык</TableHead>
                <TableHead>Время (мин)</TableHead>
                <TableHead>Блоки (Предметы)</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right pr-6">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Тесты пока не созданы.
                  </TableCell>
                </TableRow>
              ) : (
                tests.map((test) => (
                  <TableRow key={test.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 font-bold">{test.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{test.class_number} класс</Badge>
                    </TableCell>
                    <TableCell className="uppercase font-medium">{test.language}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {test.total_time_minutes}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {test.blocks.map((b, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] uppercase">
                            {b.subject} ({b.question_count})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {test.is_active ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Активен</Badge>
                      ) : (
                        <Badge variant="outline">Черновик</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/tests/${test.id}`)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Редактировать
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
