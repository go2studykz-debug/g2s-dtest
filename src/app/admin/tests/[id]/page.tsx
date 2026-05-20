
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronLeft, Save, Plus, Trash2, Clock, 
  BookOpen, LayoutGrid, Info
} from 'lucide-react';
import { getTestById, saveTest } from '@/app/lib/actions';
import { Test, Subject, TestBlock } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';

const SUBJECTS_INFO: Record<Subject, string> = {
  'math': 'Математика',
  'quantitative': 'Количественные характеристики',
  'logic': 'Логика',
  'science': 'Естествознание',
  'kazakh': 'Казахский язык',
  'russian': 'Русский язык',
  'english': 'Английский язык'
};

export default function TestEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    async function load() {
      if (id === 'new') {
        setTest({
          id: Math.random().toString(36).substr(2, 9),
          name: 'Новый диагностический тест',
          class_number: 4,
          language: 'ru',
          is_active: false,
          total_time_minutes: 60,
          blocks: [],
          created_at: new Date()
        });
      } else {
        const data = await getTestById(id);
        setTest(data);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!test) return;
    try {
      await saveTest(test);
      toast({ title: 'Сохранено', description: 'Данные теста успешно обновлены.' });
      router.push('/admin/tests');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить тест.' });
    }
  };

  const addBlock = () => {
    if (!test) return;
    const newBlock: TestBlock = {
      subject: 'math',
      question_count: 10,
      time_limit_minutes: 15
    };
    setTest({ ...test, blocks: [...test.blocks, newBlock] });
  };

  const removeBlock = (index: number) => {
    if (!test) return;
    const updated = [...test.blocks];
    updated.splice(index, 1);
    setTest({ ...test, blocks: updated });
  };

  const updateBlock = (index: number, fields: Partial<TestBlock>) => {
    if (!test) return;
    const updated = [...test.blocks];
    updated[index] = { ...updated[index], ...fields };
    setTest({ ...test, blocks: updated });
  };

  if (loading || !test) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.push('/admin/tests')} className="text-muted-foreground -ml-2 h-8">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
          </Button>
          <h1 className="text-3xl font-headline font-bold text-[#081d3a]">
            {id === 'new' ? 'Создание теста' : 'Редактирование теста'}
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/admin/tests')}>Отмена</Button>
          <Button onClick={handleSave} className="bg-[#14bf96] hover:bg-[#11a381]">
            <Save className="w-4 h-4 mr-2" /> Сохранить тест
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Основная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Название теста</Label>
                <Input 
                  id="name" 
                  value={test.name} 
                  onChange={e => setTest({...test, name: e.target.value})}
                  className="h-12 border-border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Класс</Label>
                  <Select 
                    value={test.class_number.toString()} 
                    onValueChange={val => setTest({...test, class_number: parseInt(val)})}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} класс</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Язык</Label>
                  <Select 
                    value={test.language} 
                    onValueChange={val => setTest({...test, language: val as any})}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Язык" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kk">Казахский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
                <div className="space-y-0.5">
                  <Label className="text-base">Активен</Label>
                  <p className="text-xs text-muted-foreground">Доступен ли тест для прохождения учениками.</p>
                </div>
                <Switch 
                  checked={test.is_active} 
                  onCheckedChange={val => setTest({...test, is_active: val})}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                  Блоки по предметам
                </CardTitle>
                <CardDescription>Разделите тест на секции с разным временем.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addBlock}>
                <Plus className="w-4 h-4 mr-1" /> Добавить блок
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.blocks.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
                  Нет добавленных блоков. Нажмите "Добавить блок".
                </div>
              ) : (
                test.blocks.map((block, idx) => (
                  <div key={idx} className="p-6 rounded-xl border border-border bg-[#f9fafb] space-y-4 relative group">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeBlock(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Предмет</Label>
                        <Select 
                          value={block.subject} 
                          onValueChange={val => updateBlock(idx, { subject: val as Subject })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SUBJECTS_INFO).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Кол-во вопросов</Label>
                        <Input 
                          type="number" 
                          className="bg-white"
                          value={block.question_count}
                          onChange={e => updateBlock(idx, { question_count: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Время (мин)</Label>
                        <Input 
                          type="number" 
                          className="bg-white"
                          value={block.time_limit_minutes}
                          onChange={e => updateBlock(idx, { time_limit_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-white shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Контрольная панель</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Общее время</span>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-3xl font-bold font-headline">
                  {test.blocks.reduce((acc, b) => acc + b.time_limit_minutes, 0)} мин
                </p>
              </div>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Всего вопросов</span>
                  <BookOpen className="w-4 h-4 text-accent" />
                </div>
                <p className="text-3xl font-bold font-headline">
                  {test.blocks.reduce((acc, b) => acc + b.question_count, 0)}
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <Button className="w-full bg-[#14bf96] hover:bg-[#11a381]" onClick={handleSave}>
                  Опубликовать тест
                </Button>
                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                  Последнее изменение: {test.created_at.toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
