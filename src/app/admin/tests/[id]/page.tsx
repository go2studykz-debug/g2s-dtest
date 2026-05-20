
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
  BookOpen, LayoutGrid, Info, HelpCircle, Edit2
} from 'lucide-react';
import { getTestById, saveTest, getQuestions, saveQuestion, deleteQuestion } from '@/app/lib/actions';
import { Test, Subject, TestBlock, Question } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const SUBJECTS_INFO: Record<Subject, string> = {
  'math': 'Математика',
  'quantitative': 'Количественные характеристики',
  'logic': 'Логика',
  'science': 'Естествознание',
  'kazakh': 'Казахский язык',
  'russian': 'Русский язык',
  'english': 'Английский язык'
};

export default function UnifiedTestEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    async function load() {
      if (id === 'new') {
        const newTest: Test = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Новый диагностический тест',
          class_number: 4,
          language: 'ru',
          is_active: false,
          total_time_minutes: 60,
          blocks: [],
          created_at: new Date()
        };
        setTest(newTest);
      } else {
        const data = await getTestById(id);
        if (data) {
          setTest(data);
          const qs = await getQuestions(data.class_number, data.language);
          // For simplicity in prototype, filter by test_id
          setQuestions(qs.filter(q => q.test_id === id));
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSaveTest = async () => {
    if (!test) return;
    try {
      await saveTest(test);
      toast({ title: 'Сохранено', description: 'Данные теста обновлены.' });
      router.push('/admin/tests');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка сохранения' });
    }
  };

  // --- Блоки ---
  const addBlock = () => {
    if (!test) return;
    const newBlock: TestBlock = { subject: 'math', question_count: 10, time_limit_minutes: 15 };
    setTest({ ...test, blocks: [...test.blocks, newBlock] });
  };

  const updateBlock = (index: number, fields: Partial<TestBlock>) => {
    if (!test) return;
    const updated = [...test.blocks];
    updated[index] = { ...updated[index], ...fields };
    setTest({ ...test, blocks: updated });
  };

  const removeBlock = (index: number) => {
    if (!test) return;
    const updated = [...test.blocks];
    updated.splice(index, 1);
    setTest({ ...test, blocks: updated });
  };

  // --- Вопросы ---
  const handleAddQuestion = (subject: Subject) => {
    setEditingQuestion({
      id: Math.random().toString(36).substr(2, 9),
      test_id: test?.id || '',
      question_number: questions.length + 1,
      subject,
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      correct_answer: 'A'
    });
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    await saveQuestion(editingQuestion);
    const updated = (await getQuestions(test!.class_number, test!.language)).filter(q => q.test_id === id);
    setQuestions(updated);
    setEditingQuestion(null);
    toast({ title: 'Вопрос сохранен' });
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Удалить вопрос?')) return;
    await deleteQuestion(qId);
    setQuestions(questions.filter(q => q.id !== qId));
    toast({ title: 'Вопрос удален' });
  };

  if (loading || !test) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.push('/admin/tests')} className="text-muted-foreground -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
          </Button>
          <h1 className="text-3xl font-headline font-bold">Редактор Диагностики</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/admin/tests')}>Отмена</Button>
          <Button onClick={handleSaveTest} className="bg-[#14bf96] hover:bg-[#11a381] font-bold">
            <Save className="w-4 h-4 mr-2" /> Сохранить изменения
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Левая колонка: Настройки и Блоки */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> Основные данные
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Название теста</Label>
                <Input value={test.name} onChange={e => setTest({...test, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Класс</Label>
                  <Select value={test.class_number.toString()} onValueChange={v => setTest({...test, class_number: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[4, 5, 6].map(c => <SelectItem key={c} value={c.toString()}>{c} класс</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Язык</Label>
                  <Select value={test.language} onValueChange={v => setTest({...test, language: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kk">Казахский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border">
                <Label>Активен</Label>
                <Switch checked={test.is_active} onCheckedChange={v => setTest({...test, is_active: v})} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" /> Архитектура блоков
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addBlock}><Plus className="w-3 h-3 mr-1" /> Добавить</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.blocks.map((block, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-muted/10 relative group space-y-3">
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeBlock(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase">Предмет</Label>
                      <Select value={block.subject} onValueChange={v => updateBlock(idx, { subject: v as Subject })}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(SUBJECTS_INFO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase">Время (мин)</Label>
                      <Input type="number" className="bg-white" value={block.time_limit_minutes} onChange={e => updateBlock(idx, { time_limit_minutes: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка: Наполнение вопросами */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-border bg-white shadow-sm min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#14bf96]" /> Контент вопросов
              </CardTitle>
              <CardDescription>Добавляйте вопросы для каждого предмета, определенного в структуре.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {test.blocks.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                  Сначала добавьте блоки предметов в архитектуру слева.
                </div>
              ) : (
                test.blocks.map((block, bIdx) => {
                  const subjectQs = questions.filter(q => q.subject === block.subject);
                  return (
                    <div key={bIdx} className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-primary">{SUBJECTS_INFO[block.subject]}</h3>
                        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/5 h-7 text-xs font-bold" onClick={() => handleAddQuestion(block.subject)}>
                          <Plus className="w-3 h-3 mr-1" /> Добавить вопрос
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {subjectQs.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground py-2 text-center">Нет вопросов для этого предмета.</p>
                        ) : (
                          subjectQs.map((q) => (
                            <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 transition-all group">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold opacity-30">#{q.question_number}</span>
                                <p className="text-sm font-medium line-clamp-1 max-w-md">{q.question_text}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setEditingQuestion(q)}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl text-[#081d3a]">
            <DialogHeader>
              <DialogTitle>Редактирование вопроса: {SUBJECTS_INFO[editingQuestion.subject]}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Номер вопроса</Label>
                  <Input type="number" value={editingQuestion.question_number} onChange={e => setEditingQuestion({...editingQuestion, question_number: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Текст вопроса</Label>
                <textarea 
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background" 
                  value={editingQuestion.question_text} 
                  onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D', 'E'].map(l => (
                  <div key={l} className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Вариант {l}</Label>
                    <Input 
                      value={(editingQuestion as any)[`option_${l.toLowerCase()}`] || ''} 
                      onChange={e => setEditingQuestion({...editingQuestion, [`option_${l.toLowerCase()}`]: e.target.value} as any)} 
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Правильный ответ</Label>
                  <Select value={editingQuestion.correct_answer} onValueChange={v => setEditingQuestion({...editingQuestion, correct_answer: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['A', 'B', 'C', 'D', 'E'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>Отмена</Button>
              <Button onClick={handleSaveQuestion} className="bg-[#14bf96] font-bold">Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
