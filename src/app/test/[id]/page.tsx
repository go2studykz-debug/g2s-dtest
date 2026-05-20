
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronRight, ChevronLeft, Send, AlertTriangle } from 'lucide-react';
import { getResultDetail, submitAnswer, logAntiCheat, finishTest } from '@/app/lib/actions';
import { StudentResult, Question } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TestingInterface({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(3600); 
  const [isFinishing, setIsFinishing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const questionStartRef = useRef<number>(Date.now());
  const antiCheatActive = useRef(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getResultDetail(id);
        if (data && data.result) {
          setResult(data.result);
          // Assuming the detail endpoint returns questions or we fetch them based on test_id
          // For the prototype, we rely on the action logic
          const { result: res, questions: qs } = await import('@/app/lib/actions').then(m => m.startTest({
            testId: data.result.test_id,
            name: data.result.student_name,
            city: data.result.student_city,
            whatsapp: data.result.parent_whatsapp,
            classNumber: data.result.class_number,
            language: data.result.language
          }));
          
          setQuestions(qs);
          const existingAnswers: Record<string, string> = {};
          data.answers.forEach(a => {
            if (a.student_answer) existingAnswers[a.question_id] = a.student_answer;
          });
          setAnswers(existingAnswers);
        } else {
          toast({ variant: 'destructive', title: 'Ошибка', description: 'Сессия не найдена.' });
          router.push('/');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router, toast]);

  useEffect(() => {
    if (loading || !result || questions.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && antiCheatActive.current) {
        logAntiCheat({
          resultId: id,
          eventType: 'tab_switch',
          questionNumber: questions[currentIndex]?.question_number || 0,
          duration: 0,
          details: 'Смена вкладки'
        });
        toast({
          variant: 'destructive',
          title: 'Система контроля',
          description: 'Переключение вкладок зафиксировано.',
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id, currentIndex, questions, toast, loading, result]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswer = async (val: string) => {
    const now = Date.now();
    const timeSpent = Math.round((now - questionStartRef.current) / 1000);
    const q = questions[currentIndex];
    
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    await submitAnswer({
      resultId: id,
      questionId: q.id,
      answer: val,
      timeSpent
    });
    
    questionStartRef.current = Date.now();
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    antiCheatActive.current = false;
    try {
      await finishTest(id);
      router.push(`/test/${id}/complete`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка завершения' });
    } finally {
      setIsFinishing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading || !result || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#1E293B]" />
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const SUBJECT_MAP: Record<string, string> = {
    'math': 'МАТЕМАТИКА',
    'logic': 'ЛОГИКА',
    'english': 'АНГЛИЙСКИЙ',
    'second_lang': 'ВТОРОЙ ЯЗЫК'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#1E293B]">
      {/* Header */}
      <header className="bg-white border-b px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#1E293B]">
            go<span className="text-[#FF4D00]">2</span>study
          </span>
        </div>
        <div className="flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-lg border">
          <Clock className="w-5 h-5 text-[#64748B]" />
          <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
        </div>
      </header>

      <Progress value={progress} className="h-1.5 rounded-none bg-[#E2E8F0] [&>div]:bg-[#1E293B]" />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Question */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center text-sm font-medium text-[#64748B]">
            <span>{currentIndex + 1} / {questions.length}</span>
          </div>

          <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-8 min-h-[500px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[#64748B] text-sm">Вопрос {currentIndex + 1} из {questions.length}</p>
                <Badge className="bg-[#E2E8F0] text-[#475569] hover:bg-[#E2E8F0] border-none px-3 py-1 font-bold rounded-md">
                  {SUBJECT_MAP[currentQuestion.subject] || currentQuestion.subject}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold leading-snug">
                {currentQuestion.question_text}
              </h2>

              <RadioGroup 
                value={answers[currentQuestion.id] || ""} 
                onValueChange={handleAnswer}
                className="grid gap-4"
              >
                {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                  const optionKey = `option_${letter.toLowerCase()}` as keyof Question;
                  const optionValue = currentQuestion[optionKey] as string;
                  if (!optionValue) return null;

                  const isSelected = answers[currentQuestion.id] === letter;

                  return (
                    <Label
                      key={letter}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                        isSelected 
                          ? "border-[#1E293B] bg-slate-50 shadow-sm" 
                          : "border-[#F1F5F9] hover:border-[#E2E8F0]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2",
                        isSelected 
                          ? "bg-[#1E293B] text-white border-[#1E293B]" 
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                      )}>
                        {letter}
                      </div>
                      <span className="text-lg font-medium">{optionValue}</span>
                      <RadioGroupItem value={letter} className="sr-only" />
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between pt-8">
              <Button 
                variant="outline" 
                className="h-12 px-8 rounded-xl border-[#E2E8F0] font-bold text-[#64748B]"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 mr-2" /> Назад
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button 
                  className="h-12 px-8 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold"
                  onClick={handleFinish} 
                  disabled={isFinishing}
                >
                  Завершить <Send className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  className="h-12 px-8 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold"
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                >
                  Далее <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Navigation */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border p-6 shadow-sm sticky top-24">
            <h3 className="text-sm font-bold text-[#475569] uppercase tracking-wider mb-6">Навигация по вопросам</h3>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-3 mb-8">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      isCurrent ? "ring-2 ring-[#1E293B] ring-offset-2" : "",
                      isAnswered 
                        ? "bg-[#1E293B] text-white" 
                        : "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0]"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t">
              <div className="flex items-center gap-3 text-sm font-medium text-[#64748B]">
                <div className="w-4 h-4 rounded bg-[#1E293B]" />
                <span>Отвечен</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-[#64748B]">
                <div className="w-4 h-4 rounded bg-[#F1F5F9] border" />
                <span>Пропущен</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t bg-white flex justify-center">
        <div className="flex items-center gap-2 text-[#94A3B8] text-xs font-bold uppercase tracking-widest">
          <AlertTriangle className="w-4 h-4" />
          Не обновляйте страницу • Прогресс сохраняется автоматически
        </div>
      </footer>
    </div>
  );
}
