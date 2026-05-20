
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit2, ChevronLeft, Trash2, 
  MessageSquare, Settings2, HelpCircle
} from 'lucide-react';
import { getQuestions, saveQuestion, deleteQuestion } from '@/app/lib/actions';
import { Question, Subject, Language } from '@/app/lib/types';
import { cn } from '@/lib/utils';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
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

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<number>(4);
  const [selectedLang, setSelectedLang] = useState<Language>('ru');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getQuestions(selectedClass, selectedLang);
      setQuestions(data);
      setLoading(false);
    }
    load();
  }, [selectedClass, selectedLang]);

  const handleEdit = (q: Question) => {
    setEditingQuestion({ ...q });
  };

  const handleAddNew = () => {
    setEditingQuestion({
      id: Math.random().toString(36).substr(2, 9),
      test_id: 'test-1', // default or dynamic
      question_number: questions.length + 1,
      subject: 'math',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      correct_answer: 'A'
    });
  };

  const handleSave = async () => {
    if (!editingQuestion) return;
    try {
      await saveQuestion(editingQuestion);
      const updated = await getQuestions(selectedClass, selectedLang);
      setQuestions(updated);
      setEditingQuestion(null);
      toast({ title: 'Успех', description: 'Вопрос успешно сохранен.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить вопрос.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) return;
    try {
      await deleteQuestion(id);
      const updated = await getQuestions(selectedClass, selectedLang);
      setQuestions(updated);
      toast({ title: 'Удалено', description: 'Вопрос успешно удален.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка' });
    }
  };

  const questionsBySubject = (questions || []).reduce((acc, q) => {
    if (!acc[q.subject]) acc[q.subject] = [];
    acc[q.subject].push(q);
    return acc;
  }, {} as Record<Subject, Question[]>);

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')} className="text-muted-foreground -ml-2 h-8">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад в дашборд
          </Button>
          <h1 className="text-3xl font-headline font-bold text-[#081d3a]">Управление вопросами</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full">
            <Settings2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground">Класс:</span>
            <div className="flex gap-2">
              {[4, 5, 6].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-bold transition-all border-2",
                    selectedClass === c 
                      ? "bg-[#081d3a] text-white border-[#081d3a]" 
                      : "bg-white text-[#081d3a] border-[#e3e8ee] hover:border-[#081d3a]"
                  )}
                >
                  {c} класс
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground">Язык:</span>
            <div className="flex gap-2">
              {[
                { val: 'ru', label: 'Русский', color: 'bg-orange-500' },
                { val: 'kk', label: 'Казахский', color: 'bg-orange-500' }
              ].map(lang => (
                <button
                  key={lang.val}
                  onClick={() => setSelectedLang(lang.val as Language)}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-bold transition-all border-2",
                    selectedLang === lang.val 
                      ? `${lang.color} text-white border-transparent` 
                      : "bg-white text-[#081d3a] border-[#e3e8ee] hover:border-[#081d3a]"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e3e8ee] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#081d3a]">
              {selectedClass} класс / {selectedLang === 'ru' ? 'Русский' : 'Казахский'} — {questions.length} вопросов
            </h2>
            <Button onClick={handleAddNew} className="bg-[#14bf96] hover:bg-[#11a381]">
              <Plus className="w-4 h-4 mr-2" /> Добавить вопрос
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14bf96]" />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">
              В данном разделе пока нет вопросов.
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(SUBJECTS_INFO).map(([subject, label]) => {
                const subjectQuestions = questionsBySubject[subject as Subject] || [];
                if (subjectQuestions.length === 0) return null;

                return (
                  <div key={subject} className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#14bf96]" />
                      {label} ({subjectQuestions.length})
                    </h3>
                    <div className="grid gap-3">
                      {subjectQuestions.map((q) => (
                        <Card key={q.id} className="border-[#e3e8ee] hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <Badge variant="outline" className="mt-1 h-6 w-10 flex justify-center bg-muted/30">
                                {q.question_number}
                              </Badge>
                              <div className="space-y-1">
                                <p className="font-medium text-[#081d3a] line-clamp-1">{q.question_text}</p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Верный ответ: <strong className="text-[#14bf96]">{q.correct_answer}</strong></span>
                                  <span>Опций: {[q.option_a, q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean).length}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(q)} className="h-8 w-8 text-primary hover:bg-primary/10">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактирование вопроса</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Предмет</Label>
                  <Select 
                    value={editingQuestion.subject} 
                    onValueChange={(val: Subject) => setEditingQuestion({ ...editingQuestion, subject: val })}
                  >
                    <SelectTrigger>
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
                  <Label>Номер вопроса</Label>
                  <Input 
                    type="number" 
                    value={editingQuestion.question_number} 
                    onChange={e => setEditingQuestion({ ...editingQuestion, question_number: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Текст вопроса</Label>
                <textarea 
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                  value={editingQuestion.question_text}
                  onChange={e => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <div key={opt} className="space-y-1.5">
                    <Label>Вариант {opt}</Label>
                    <Input 
                      value={(editingQuestion as any)[`option_${opt.toLowerCase()}`] || ''} 
                      onChange={e => setEditingQuestion({ ...editingQuestion, [`option_${opt.toLowerCase()}`]: e.target.value } as any)}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Правильный ответ</Label>
                  <Select 
                    value={editingQuestion.correct_answer} 
                    onValueChange={val => setEditingQuestion({ ...editingQuestion, correct_answer: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E'].map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>Отмена</Button>
              <Button onClick={handleSave} className="bg-[#14bf96]">Сохранить изменения</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
