'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft, Save, Plus, Trash2, LayoutGrid, Info, HelpCircle, Edit2,
  Upload, Loader2, Check, Image, X, AlertTriangle, Sparkles
} from 'lucide-react';
import { getTestById, saveTest, deleteTest, getQuestionsByTestId, importQuestionsFromFile, generateTopicsForTest } from '@/app/lib/actions';
import { Test, Subject, TestBlock, Question } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useFirestore, useStorage } from '@/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn, stripMarkdown } from '@/lib/utils';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { MathText } from '@/components/ui/math-text';

const SUBJECTS_INFO: Record<Subject, string> = {
  math: 'Математика',
  quantitative: 'Количественные характеристики',
  logic: 'Логика',
  science: 'Естествознание',
  kazakh: 'Казахский язык',
  russian: 'Русский язык',
  english: 'Английский язык',
};

const MATH_SYMBOLS = [
  { label: 'x²', value: '²' }, { label: 'x³', value: '³' },
  { label: '√', value: '√' }, { label: '∛', value: '∛' },
  { label: '½', value: '½' }, { label: '¼', value: '¼' },
  { label: '¾', value: '¾' }, { label: '⅓', value: '⅓' },
  { label: '×', value: '×' }, { label: '÷', value: '÷' },
  { label: '≠', value: '≠' }, { label: '≤', value: '≤' },
  { label: '≥', value: '≥' }, { label: '±', value: '±' },
  { label: '≈', value: '≈' }, { label: '∞', value: '∞' },
  { label: 'π', value: 'π' }, { label: '°', value: '°' },
  { label: '∠', value: '∠' }, { label: '⊥', value: '⊥' },
  { label: 'α', value: 'α' }, { label: 'β', value: 'β' },
  { label: 'γ', value: 'γ' }, { label: 'θ', value: 'θ' },
  { label: 'Σ', value: 'Σ' }, { label: 'Δ', value: 'Δ' },
  { label: '→', value: '→' }, { label: '∈', value: '∈' },
];

export default function UnifiedTestEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Quantitative split for editor
  const [quantCond, setQuantCond] = useState('');
  const [quantColA, setQuantColA] = useState('');
  const [quantColB, setQuantColB] = useState('');


  // LaTeX keyboard
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const activeElRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // AI import
  const [importSubject, setImportSubject] = useState<Subject | 'auto'>('auto');
  const [importStartNum, setImportStartNum] = useState(1);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate topics
  const [generatingTopics, setGeneratingTopics] = useState(false);

  // Image upload for questions
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Delete test confirmation (step 1 and 2)
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (id === 'new') {
        setTest({
          id: 'test-' + Math.random().toString(36).substring(2, 11),
          name: 'Новый диагностический тест',
          class_number: 6, language: 'ru', is_active: false,
          total_time_minutes: 60, blocks: [], created_at: new Date(),
        });
      } else {
        const data = await getTestById(id);
        if (data) {
          setTest(data);
          setQuestions(await getQuestionsByTestId(id));
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // ── LaTeX keyboard ─────────────────────────────────────────────────────────
  const insertMathSymbol = (symbol: string) => {
    const el = activeElRef.current;
    if (!focusedField || !editingQuestion) return;

    if (focusedField === '__quantColA' || focusedField === '__quantColB') {
      const isA = focusedField === '__quantColA';
      const cur = isA ? quantColA : quantColB;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? cur.length;
      const nv = cur.substring(0, start) + symbol + cur.substring(end);
      if (isA) setQuantColA(nv); else setQuantColB(nv);
      setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(start + symbol.length, start + symbol.length); } }, 0);
    } else {
      const cur = (editingQuestion as any)[focusedField] || '';
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? cur.length;
      const nv = cur.substring(0, start) + symbol + cur.substring(end);
      setEditingQuestion({ ...editingQuestion, [focusedField]: nv } as any);
      setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(start + symbol.length, start + symbol.length); } }, 0);
    }
  };

  const handleFieldFocus = (field: string, el: HTMLInputElement | HTMLTextAreaElement) => {
    setFocusedField(field);
    activeElRef.current = el;
  };

  const handleGenerateTopics = async () => {
    if (!test) return;
    if (!confirm(`Сгенерировать темы для всех вопросов этого теста?\n\nОперация выполняется один раз и сохраняет темы навсегда.`)) return;
    setGeneratingTopics(true);
    try {
      const result = await generateTopicsForTest(test.class_number, test.language);
      toast({ title: 'Темы сгенерированы', description: `Обновлено: ${result.updated}, пропущено: ${result.skipped}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка генерации тем', description: e.message || String(e) });
    } finally {
      setGeneratingTopics(false);
    }
  };

  // ── Test handlers ──────────────────────────────────────────────────────────
  const handleSaveTest = async () => {
    if (!test) return;
    try {
      await saveTest(test);
      toast({ title: 'Сохранено', description: 'Конфигурация теста обновлена.' });
      router.push('/admin/tests');
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка сохранения' });
    }
  };

  const addBlock = () => {
    if (!test) return;
    setTest({ ...test, blocks: [...test.blocks, { subject: 'math', question_count: 10, time_limit_minutes: 15 }] });
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

  // ── Question handlers ──────────────────────────────────────────────────────
  const openAddQuestion = (subject: Subject) => {
    setEditingQuestion({
      id: 'q-' + Math.random().toString(36).substring(2, 11),
      test_id: test?.id || '',
      question_number: questions.filter(q => q.subject === subject).length + 1,
      subject, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', correct_answer: 'A',
    });
    setQuantColA(''); setQuantColB('');
    setShowMathKeyboard(false);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion({ ...q });
    if (q.subject === 'quantitative') {
      const parts = q.question_text.split('|||');
      if (parts.length >= 3) {
        setQuantCond(parts[0]?.trim() || '');
        setQuantColA(parts[1]?.trim() || '');
        setQuantColB(parts[2]?.trim() || '');
      } else {
        setQuantCond('');
        setQuantColA(parts[0]?.trim() || '');
        setQuantColB(parts[1]?.trim() || '');
      }
    } else {
      setQuantCond(''); setQuantColA(''); setQuantColB('');
    }
    setShowMathKeyboard(false);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion || !test || !db) return;
    try {
      let toSave = { ...editingQuestion };
      if (toSave.subject === 'quantitative') {
        const cond = quantCond.trim();
        toSave.question_text = cond
          ? `${cond}|||${quantColA.trim()}|||${quantColB.trim()}`
          : `${quantColA.trim()}|||${quantColB.trim()}`;
      }
      const qRef = doc(db, 'questions', toSave.id);
      const { id: _, ...data } = toSave;
      await setDoc(qRef, { ...data, updated_at: new Date().toISOString() }, { merge: true });
      setQuestions(prev => {
        const exists = prev.find(q => q.id === toSave.id);
        const list = exists ? prev.map(q => q.id === toSave.id ? toSave : q) : [...prev, toSave];
        return list.sort((a, b) => a.question_number - b.question_number);
      });
      setEditingQuestion(null);
      toast({ title: 'Вопрос сохранён' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить.' });
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Удалить вопрос?') || !db) return;
    try {
      await deleteDoc(doc(db, 'questions', qId));
      setQuestions(questions.filter(q => q.id !== qId));
      toast({ title: 'Вопрос удалён' });
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка удаления' });
    }
  };

  // ── AI import handlers ─────────────────────────────────────────────────────
  const openImportFor = (subject: Subject) => {
    setImportSubject(subject);
    setImportStartNum(questions.filter(q => q.subject === subject).length + 1);
    setImportFile(null);
    setShowImportDialog(true);
  };

  const handleImport = async () => {
    if (!importFile || !test) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('testId', test.id);
      formData.append('classNumber', String(test.class_number));
      formData.append('language', test.language);
      formData.append('startingNumber', String(importStartNum));
      formData.append('subject', importSubject === 'auto' ? '' : importSubject);
      const result = await importQuestionsFromFile(formData);
      if (result.error) throw new Error(result.error);
      setImportedQuestions(result.questions);
      setShowImportDialog(false);
      setShowReviewDialog(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка импорта', description: e.message || String(e) });
    } finally {
      setImporting(false);
    }
  };

  const handleSaveImported = async () => {
    if (!db) return;
    setSavingImport(true);
    try {
      for (const q of importedQuestions) {
        const qId = 'q-' + Math.random().toString(36).substring(2, 11);
        await setDoc(doc(db, 'questions', qId), { ...q, id: qId });
      }
      setQuestions(await getQuestionsByTestId(test?.id || ''));
      setShowReviewDialog(false);
      setImportedQuestions([]);
      setImportFile(null);
      toast({ title: 'Импорт завершён', description: `Сохранено ${importedQuestions.length} вопросов.` });
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка при сохранении' });
    } finally {
      setSavingImport(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!editingQuestion) return;
    setImageUploading(true);
    try {
      const path = `question-images/${editingQuestion.id}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      setEditingQuestion({ ...editingQuestion, image_url: url });
      toast({ title: 'Изображение загружено' });
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка загрузки изображения' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!test) return;
    setDeleting(true);
    try {
      await deleteTest(test.id);
      toast({ title: 'Тест удалён' });
      router.push('/admin/tests');
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка удаления теста' });
      setDeleting(false);
      setShowDeleteStep2(false);
    }
  };

  const blockInvalidChars = (e: React.KeyboardEvent) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
  };

  const handleNumberInput = (val: string, cb: (n: number) => void) => {
    const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
    cb(isNaN(n) ? 0 : n);
  };

  if (loading || !test) return (
    <div className="min-h-screen flex items-center justify-center italic opacity-30">Загрузка редактора...</div>
  );

  const isQuantEdit = editingQuestion?.subject === 'quantitative';

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-[#081d3a]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.push('/admin/tests')} className="text-muted-foreground -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
          </Button>
          <h1 className="text-3xl font-bold">Редактор Диагностики</h1>
        </div>
        <div className="flex gap-3">
          {id !== 'new' && (
            <Button variant="outline"
              className="border-red-300 text-red-500 hover:bg-red-50 font-bold"
              onClick={() => setShowDeleteStep1(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Удалить тест
            </Button>
          )}
          {id !== 'new' && (
            <Button variant="outline" onClick={handleGenerateTopics} disabled={generatingTopics}
              className="border-purple-400 text-purple-600 hover:bg-purple-50 font-bold">
              {generatingTopics ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generatingTopics ? 'Генерация...' : 'Темы вопросов (ИИ)'}
            </Button>
          )}
          <Button variant="outline"
            className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold"
            onClick={() => { setImportSubject('auto'); setImportStartNum(questions.length + 1); setImportFile(null); setShowImportDialog(true); }}>
            <Upload className="w-4 h-4 mr-2" /> Импорт через ИИ
          </Button>
          <Button onClick={handleSaveTest} className="bg-[#14bf96] hover:bg-[#11a381] font-bold">
            <Save className="w-4 h-4 mr-2" /> Сохранить тест
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: settings */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> Настройки теста</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Название</Label><Input value={test.name} onChange={e => setTest({ ...test, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Класс</Label>
                  <Select value={test.class_number.toString()} onValueChange={v => setTest({ ...test, class_number: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[4, 5, 6].map(c => <SelectItem key={c} value={c.toString()}>{c} класс</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Язык</Label>
                  <Select value={test.language} onValueChange={v => setTest({ ...test, language: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="kz">Казахский</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl border">
                <Label className="font-bold">Статус активации</Label>
                <Switch checked={test.is_active} onCheckedChange={v => setTest({ ...test, is_active: v })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary" /> Предметные блоки</CardTitle>
              <Button size="sm" variant="outline" onClick={addBlock}><Plus className="w-3 h-3 mr-1" /> Добавить блок</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.blocks.map((block, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-muted/10 relative group space-y-3">
                  <Button variant="ghost" size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive h-7 w-7"
                    onClick={() => removeBlock(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase opacity-50">Предмет</Label>
                      <Select value={block.subject} onValueChange={v => updateBlock(idx, { subject: v as Subject })}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(SUBJECTS_INFO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase opacity-50">Время (мин)</Label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" className="bg-white"
                        onKeyDown={blockInvalidChars}
                        value={block.time_limit_minutes === 0 ? "" : block.time_limit_minutes.toString()}
                        onChange={e => handleNumberInput(e.target.value, n => updateBlock(idx, { time_limit_minutes: n }))} />
                    </div>
                  </div>
                </div>
              ))}
              {test.blocks.length === 0 && (
                <p className="text-xs text-center text-muted-foreground italic py-4">Нажмите «Добавить блок» чтобы задать структуру теста.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: questions */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-border bg-white shadow-sm min-h-[500px]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#14bf96]" /> Контент вопросов ({questions.length})
                  </CardTitle>
                  <CardDescription>Добавляйте вопросы вручную или импортируйте из PDF через ИИ.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {test.blocks.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                  Сначала добавьте предметы в настройках слева.
                </div>
              ) : (
                test.blocks.map((block, bIdx) => {
                  const subjectQs = questions.filter(q => q.subject === block.subject);
                  return (
                    <div key={bIdx} className="space-y-3">
                      {/* Block header with both buttons */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-primary">
                          {SUBJECTS_INFO[block.subject]}
                          <span className="ml-2 text-muted-foreground font-normal normal-case tracking-normal text-xs">
                            ({subjectQs.length} вопросов · {block.time_limit_minutes} мин)
                          </span>
                        </h3>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs font-bold border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7]"
                            onClick={() => openImportFor(block.subject)}>
                            <Upload className="w-3 h-3 mr-1" /> Импорт ИИ
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="text-primary hover:bg-primary/5 h-7 text-xs font-bold"
                            onClick={() => openAddQuestion(block.subject)}>
                            <Plus className="w-3 h-3 mr-1" /> Добавить
                          </Button>
                        </div>
                      </div>

                      {/* Question list */}
                      <div className="grid gap-2">
                        {subjectQs.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground py-3 text-center border-2 border-dashed rounded-lg">
                            Нет вопросов — добавьте вручную или импортируйте PDF
                          </p>
                        ) : (
                          subjectQs.map(q => {
                            const isQuant = q.subject === 'quantitative';
                            const qParts = isQuant ? q.question_text.split('|||') : null;
                            return (
                              <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 transition-all group">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-bold opacity-30 shrink-0">#{q.question_number}</span>
                                  {isQuant && qParts ? (
                                    <div className="flex gap-2 text-xs min-w-0">
                                      <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 font-mono truncate max-w-[130px]">
                                        A: {qParts[0]?.trim()}
                                      </span>
                                      <span className="bg-green-50 text-green-700 border border-green-100 rounded px-2 py-0.5 font-mono truncate max-w-[130px]">
                                        B: {qParts[1]?.trim()}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium line-clamp-1">{stripMarkdown(q.question_text)}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEditQuestion(q)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
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

      {/* ── Question edit dialog ─────────────────────────────────────────── */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={open => !open && setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl text-[#081d3a] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
            <DialogHeader className="p-6 pb-2 border-b bg-white">
              <DialogTitle>Редактор вопроса: {SUBJECTS_INFO[editingQuestion.subject]}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Номер в списке</Label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*"
                    onKeyDown={blockInvalidChars}
                    value={editingQuestion.question_number === 0 ? "" : editingQuestion.question_number.toString()}
                    onChange={e => handleNumberInput(e.target.value, n => setEditingQuestion({ ...editingQuestion, question_number: n }))} />
                </div>
              </div>

              {/* Quantitative 2-column OR regular textarea */}
              {isQuantEdit ? (
                <div className="space-y-2">
                  <Label>Текст вопроса (Количественные характеристики)</Label>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Условие задания (необязательно)</p>
                    <WysiwygEditor
                      value={quantCond}
                      onChange={setQuantCond}
                      placeholder="Например: Пусть x = 3. Сравните значения..."
                      minHeight="60px"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Колонка A</p>
                      <Input placeholder="Значение / выражение" value={quantColA}
                        className="font-mono"
                        onChange={e => setQuantColA(e.target.value)}
                        onFocus={e => handleFieldFocus('__quantColA', e.target)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Колонка B</p>
                      <Input placeholder="Значение / выражение" value={quantColB}
                        className="font-mono"
                        onChange={e => setQuantColB(e.target.value)}
                        onFocus={e => handleFieldFocus('__quantColB', e.target)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Текст вопроса</Label>
                  <WysiwygEditor
                    value={editingQuestion.question_text}
                    onChange={v => setEditingQuestion({ ...editingQuestion, question_text: v })}
                    placeholder="Введите текст вопроса..."
                    minHeight="100px"
                  />
                </div>
              )}

              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Изображение к вопросу (необязательно)</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
                />
                {editingQuestion?.image_url ? (
                  <div className="relative inline-block">
                    <img src={editingQuestion.image_url} alt="" className="max-h-40 rounded-lg border border-[#e3e8ee] object-contain" />
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, image_url: null })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-[#e3e8ee] text-sm text-muted-foreground hover:border-[#14bf96] hover:text-[#14bf96] transition-all disabled:opacity-50">
                    {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    {imageUploading ? 'Загрузка...' : 'Добавить изображение'}
                  </button>
                )}
              </div>

              {/* Math keyboard */}
              <div>
                <button type="button"
                  onClick={() => setShowMathKeyboard(v => !v)}
                  className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border transition-all",
                    showMathKeyboard ? "bg-[#14bf96] text-white border-[#14bf96]" : "border-[#e3e8ee] text-muted-foreground hover:border-[#14bf96] hover:text-[#14bf96]")}>
                  {showMathKeyboard ? '✕ Скрыть клавиатуру' : '∑ Математическая клавиатура'}
                </button>
                {showMathKeyboard && (
                  <div className="mt-3 p-3 bg-[#f9fafb] rounded-xl border border-[#e3e8ee]">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase font-bold tracking-widest">Символ вставится в последнее активное поле</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MATH_SYMBOLS.map(s => (
                        <button key={s.value} type="button" onClick={() => insertMathSymbol(s.value)}
                          className="w-10 h-10 rounded-lg border border-[#e3e8ee] bg-white hover:bg-[#f0f9f7] hover:border-[#14bf96] text-sm font-mono font-bold transition-all shadow-sm">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D', 'E'].map(l => (
                  <div key={l} className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest flex justify-between">
                      Вариант {l}
                      {(l === 'D' || l === 'E') && <span className="text-primary/60">(Опционально)</span>}
                    </Label>
                    <Input
                      placeholder={(l === 'D' || l === 'E') ? "Необязательно" : `Вариант ${l}`}
                      value={(editingQuestion as any)[`option_${l.toLowerCase()}`] || ''}
                      onFocus={e => handleFieldFocus(`option_${l.toLowerCase()}`, e.target)}
                      onChange={e => setEditingQuestion({ ...editingQuestion, [`option_${l.toLowerCase()}`]: e.target.value } as any)}
                      className="bg-white h-9 text-sm" />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">Верный ответ</Label>
                  <Select value={editingQuestion.correct_answer} onValueChange={v => setEditingQuestion({ ...editingQuestion, correct_answer: v })}>
                    <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{['A', 'B', 'C', 'D', 'E'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/5 flex justify-end gap-3 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>Отмена</Button>
              <Button onClick={handleSaveQuestion} size="sm" className="bg-[#14bf96] font-bold hover:bg-[#11a381]">Сохранить вопрос</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── AI Import dialog ─────────────────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#14bf96]" />
              Импорт вопросов через ИИ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              Загрузите PDF — ИИ автоматически распознает вопросы, варианты ответов и правильные ответы.
            </p>

            {/* Subject selector */}
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select value={importSubject} onValueChange={(v) => setImportSubject(v as Subject | 'auto')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🤖 Определить автоматически</SelectItem>
                  {Object.entries(SUBJECTS_INFO).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {importSubject === 'auto' && (
                <p className="text-xs text-muted-foreground">ИИ определит предмет каждого вопроса самостоятельно</p>
              )}
            </div>

            <div onClick={() => fileInputRef.current?.click()}
              className={cn("border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                importFile ? "border-[#14bf96] bg-[#f0f9f7]" : "border-[#e3e8ee] hover:border-[#14bf96] hover:bg-[#f9fafb]")}>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden"
                onChange={e => setImportFile(e.target.files?.[0] || null)} />
              {importFile ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-[#14bf96] rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-[#081d3a]">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(0)} KB</p>
                  <button onClick={e => { e.stopPropagation(); setImportFile(null); }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold">Удалить файл</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="font-bold text-[#081d3a]">Нажмите для выбора файла</p>
                  <p className="text-xs text-muted-foreground">PDF или TXT — до 10 МБ</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Начальный номер вопроса</Label>
              <Input type="number" min={1} value={importStartNum} onKeyDown={blockInvalidChars}
                onChange={e => setImportStartNum(parseInt(e.target.value) || 1)} />
            </div>

            {importSubject === 'quantitative' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>КолХар:</strong> ИИ распознает двухколоночный формат и сохранит как <code className="bg-amber-100 px-1 rounded">A|||B</code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Отмена</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-[#14bf96] hover:bg-[#11a381]">
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Распознаю...</> : 'Распознать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review imported questions ────────────────────────────────────── */}
      {showReviewDialog && (
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-[#14bf96]" />
                Проверка: {importedQuestions.length} вопросов
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Проверьте перед сохранением. После — можно редактировать каждый вопрос отдельно.</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {importedQuestions.map((q, i) => (
                  <div key={i} className="p-3 bg-[#f9fafb] rounded-xl border border-[#e3e8ee] space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold">#{q.question_number}</Badge>
                      <Badge className="text-[10px] bg-[#14bf96]/10 text-[#14bf96] border-[#14bf96]/20">{SUBJECTS_INFO[q.subject as Subject] || q.subject}</Badge>
                      {q.correct_answer && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">✓ {q.correct_answer}</Badge>}
                    </div>
                    <p className="text-sm font-medium text-[#081d3a] line-clamp-2">{stripMarkdown(q.question_text)}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {['A', 'B', 'C', 'D'].map(l => {
                        const v = q[`option_${l.toLowerCase()}`];
                        return v ? <span key={l}><strong>{l}:</strong> {v}</span> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowReviewDialog(false); setImportedQuestions([]); }}>Отмена</Button>
              <Button onClick={handleSaveImported} disabled={savingImport} className="bg-[#14bf96] hover:bg-[#11a381]">
                {savingImport ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохраняю...</> : `Сохранить ${importedQuestions.length} вопросов`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete test: step 1 ──────────────────────────────────────────── */}
      <Dialog open={showDeleteStep1} onOpenChange={setShowDeleteStep1}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <DialogTitle className="text-lg font-bold text-[#081d3a]">Удалить тест?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground pl-13">
              Будет удалён тест <strong className="text-[#081d3a]">«{test?.name}»</strong> и все его вопросы ({questions.length} шт.). Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDeleteStep1(false)}>Отмена</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>
              Да, удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete test: step 2 (final confirmation) ─────────────────────── */}
      <Dialog open={showDeleteStep2} onOpenChange={setShowDeleteStep2}>
        <DialogContent className="max-w-md border-red-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-bold text-red-600">Вы точно уверены?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Все вопросы и данные теста будут удалены навсегда. Результаты учеников останутся в базе, но без привязки к тесту.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDeleteStep2(false)} disabled={deleting}>Отмена</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleDeleteTest}
              disabled={deleting}>
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Удаляю...</> : 'Удалить навсегда'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e3e8ee; border-radius: 10px; }
      `}</style>
    </div>
  );
}
