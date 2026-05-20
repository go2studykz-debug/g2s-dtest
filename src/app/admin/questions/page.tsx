
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit2, ChevronLeft, Trash2, Settings2, HelpCircle 
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
      test_id: 'test-1', 
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
      toast({ variant: 'destructive', title: 'Ошибка' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот вопрос?')) return;
    try {
      await deleteQuestion(id);
      const updated = await getQuestions(selectedClass, selectedLang);
      setQuestions(updated);
      toast({ title: 'Удалено' });
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
          <h1 className="text-3xl font-headline font-bold text-[#081d3a]">Банк Вопросов</h1>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-10 bg-white p-6 rounded-2xl border border-border shadow-sm">
          <div className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Выберите Класс</span>
            <div className="flex gap-2">
              {[4, 5, 6].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-sm font-bold transition-all border-2",
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

          <div className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Выберите Язык</span>
            <div className="flex gap-2">
              {['ru', 'kk'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang as Language)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-sm font-bold transition-all border-2",
                    selectedLang === lang 
                      ? "bg-[#14bf96] text-white border-[#14bf96]" 
                      : "bg-white text-[#081d3a] border-[#e3e8ee] hover:border-[#081d3a]"
                  )}
                >
                  {lang === 'ru' ? 'Русский' : 'Казахский'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#081d3a]">
              Вопросы: {selectedClass} класс, {selectedLang.toUpperCase()} ({questions.length})
            </h2>
            <Button onClick={handleAddNew} className="bg-[#14bf96] hover:bg-[#11a381]">
              <Plus className="w-4 h-4 mr-2" /> Добавить вопрос
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-muted-foreground italic">Загрузка контента...</div>
          ) : (
            <div className="space-y-12">
              {Object.entries(SUBJECTS_INFO).map(([subject, label]) => {
                const subjectQuestions = questionsBySubject[subject as Subject] || [];
                if (subjectQuestions.length === 0) return null;

                return (
                  <div key={subject} className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-primary rounded-full" />
                      {label}
                    </h3>
                    <div className="grid gap-4">
                      {subjectQuestions.map((q) => (
                        <div key={q.id} className="p-5 rounded-xl border border-border hover:border-primary/50 transition-all flex items-center justify-between group bg-background">
                          <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">#{q.question_number}</span>
                            <div>
                              <p className="font-medium text-[#081d3a] line-clamp-1 max-w-xl">{q.question_text}</p>
                              <p className="text-xs text-muted-foreground mt-1">Ответ: <strong className="text-primary">{q.correct_answer}</strong></p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(q)} className="text-primary hover:bg-primary/10">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Редактирование вопроса</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Предмет</Label>
                  <Select value={editingQuestion.subject} onValueChange={(v: Subject) => setEditingQuestion({...editingQuestion, subject: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUBJECTS_INFO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Номер</Label>
                  <Input type="number" value={editingQuestion.question_number} onChange={e => setEditingQuestion({...editingQuestion, question_number: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Текст вопроса</Label>
                <textarea className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background" value={editingQuestion.question_text} onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D', 'E'].map(l => (
                  <div key={l} className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Вариант {l}</Label>
                    <Input value={(editingQuestion as any)[`option_${l.toLowerCase()}`] || ''} onChange={e => setEditingQuestion({...editingQuestion, [`option_${l.toLowerCase()}`]: e.target.value} as any)} />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Правильный</Label>
                  <Select value={editingQuestion.correct_answer} onValueChange={v => setEditingQuestion({...editingQuestion, correct_answer: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['A', 'B', 'C', 'D', 'E'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>Отмена</Button>
              <Button onClick={handleSave} className="bg-[#14bf96]">Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
