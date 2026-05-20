'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle, GraduationCap } from 'lucide-react';
import { getResultDetail, submitAnswer, logAntiCheat, finishTest, getQuestionsByTestId, getTestById } from '@/app/lib/actions';
import { StudentResult, Question, Test } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TestingInterface({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [testInfo, setTestInfo] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null); 
  const [isFinishing, setIsFinishing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const questionStartRef = useRef<number>(Date.now());
  const antiCheatActive = useRef(true);

  // Загрузка данных сессии
  useEffect(() => {
    async function load() {
      try {
        const data = await getResultDetail(id);
        if (data && data.result) {
          if (data.result.status === 'completed') {
            router.push(`/test/${id}/complete`);
            return;
          }

          setResult(data.result);
          const t = await getTestById(data.result.test_id);
          setTestInfo(t);

          const qs = await getQuestionsByTestId(data.result.test_id);
          setQuestions(qs);

          const existingAnswers: Record<string, string> = {};
          data.answers.forEach(a => {
            if (a.student_answer) existingAnswers[a.question_id] = a.student_answer;
          });
          setAnswers(existingAnswers);

          // Инициализация таймера на основе времени старта
          const startTime = new Date(data.result.started_at).getTime();
          const now = Date.now();
          const limitMinutes = t?.total_time_minutes || 60;
          const limitSeconds = limitMinutes * 60;
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, limitSeconds - elapsedSeconds);
          
          setTimeLeft(remaining);
        } else {
          toast({ variant: 'destructive', title: 'Ошибка', description: 'Сессия не найдена.' });
          router.push('/');
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router, toast]);

  // Таймер
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isFinishing) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinishing]);

  // Анти-чит
  useEffect(() => {
    if (loading || !result || questions.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && antiCheatActive.current) {
        logAntiCheat({
          resultId: id,
          eventType: 'tab_switch',
          questionNumber: questions[currentIndex]?.question_number || 0,
          duration: 0,
          details: 'Смена вкладки браузера'
        });
        toast({
          variant: 'destructive',
          title: 'Внимание',
          description: 'Переключение вкладок фиксируется системой прокторинга.',
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id, currentIndex, questions, toast, loading, result]);

  const handleAnswer = async (val: string) => {
    const now = Date.now();
    const timeSpent = Math.round((now - questionStartRef.current) / 1000);
    const q = questions[currentIndex];
    
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    submitAnswer({
      resultId: id,
      questionId: q.id,
      answer: val,
      timeSpent
    });
    
    questionStartRef.current = Date.now();
  };

  const handleFinish = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    antiCheatActive.current = false;
    try {
      await finishTest(id);
      router.push(`/test/${id}/complete`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить результат.' });
      setIsFinishing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading || !result || questions.length === 0 || timeLeft === null) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#14bf96]" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Загрузка сессии...</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <header className="bg-white border-b border-[#e3e8ee] px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#14bf96]" />
          <span className="text-xl font-bold tracking-tight text-[#081d3a]">go2study</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors",
            timeLeft < 300 ? "bg-red-50 text-red-500 animate-pulse" : "bg-muted/50 text-[#3b3e40]"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
          </div>
          <Button 
            variant="outline" 
            className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold hidden md:flex"
            onClick={handleFinish}
            disabled={isFinishing}
          >
            {isFinishing ? 'Сдача...' : 'Сдать тест'}
          </Button>
        </div>
      </header>

      <div className="h-1.5 w-full bg-[#e3e8ee]">
        <div 
          className="h-full bg-[#14bf96] transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-[#e3e8ee] p-6 md:p-10 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#3b3e40]/40 uppercase tracking-[0.2em]">Вопрос {currentIndex + 1} / {questions.length}</p>
                  <h3 className="text-[#14bf96] font-bold text-xs uppercase tracking-widest">{currentQuestion.subject}</h3>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-[#081d3a] leading-tight">
                {currentQuestion.question_text}
              </h2>

              <RadioGroup 
                value={answers[currentQuestion.id] || ""} 
                onValueChange={handleAnswer}
                className="grid gap-3"
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
                        "flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer group",
                        isSelected 
                          ? "border-[#14bf96] bg-[#f0f9f7] shadow-sm" 
                          : "border-[#f0f1f2] hover:border-[#e3e8ee] hover:bg-[#f9fafb]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 transition-all",
                        isSelected 
                          ? "bg-[#14bf96] text-white border-[#14bf96]" 
                          : "bg-white text-[#3b3e40] border-[#e3e8ee] group-hover:border-primary"
                      )}>
                        {letter}
                      </div>
                      <span className="text-lg font-medium text-[#081d3a]">{optionValue}</span>
                      <RadioGroupItem value={letter} className="sr-only" />
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between pt-10 border-t border-[#f0f1f2] mt-10">
              <Button 
                variant="ghost" 
                className="h-12 px-6 text-[#3b3e40] font-bold"
                onClick={() => {
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                  questionStartRef.current = Date.now();
                }}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Назад
              </Button>

              <div className="flex gap-4">
                {currentIndex === questions.length - 1 ? (
                  <Button 
                    className="h-12 px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-lg animate-pulse-cta"
                    onClick={handleFinish} 
                    disabled={isFinishing}
                  >
                    {isFinishing ? '...' : 'Завершить'} <Send className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    className="h-12 px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-sm"
                    onClick={() => {
                      setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
                      questionStartRef.current = Date.now();
                    }}
                  >
                    Далее <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-[#e3e8ee] p-6 shadow-sm sticky top-24">
            <h3 className="text-[10px] font-black text-[#081d3a]/40 uppercase tracking-[0.2em] mb-6">Навигация по тесту</h3>
            
            <div className="grid grid-cols-5 gap-3 mb-8">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      questionStartRef.current = Date.now();
                    }}
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2",
                      isCurrent 
                        ? "border-[#14bf96] text-[#14bf96] ring-4 ring-[#14bf96]/5" 
                        : isAnswered 
                          ? "bg-[#14bf96] border-[#14bf96] text-white" 
                          : "bg-white border-[#f0f1f2] text-[#3b3e40] hover:border-[#e3e8ee]"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-6 border-t border-[#f0f1f2]">
              <div className="flex items-center gap-3 text-[9px] font-black text-[#3b3e40]/60 uppercase tracking-widest">
                <div className="w-3 h-3 rounded bg-[#14bf96]" />
                <span>Отвечено</span>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-black text-[#3b3e40]/60 uppercase tracking-widest">
                <div className="w-3 h-3 rounded border-2 border-[#f0f1f2] bg-white" />
                <span>Пропущено</span>
              </div>
            </div>

            <Button 
              className="w-full mt-8 bg-white border-2 border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold h-12"
              onClick={handleFinish}
              disabled={isFinishing}
            >
              {isFinishing ? '...' : 'Завершить досрочно'}
            </Button>
          </div>
          
          <div className="bg-[#f0f9f7] p-5 rounded-xl border border-[#14bf96]/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#14bf96] shrink-0 mt-0.5" />
            <p className="text-xs text-[#081d3a]/70 leading-relaxed font-medium italic">
              Прогресс сохраняется автоматически. В случае сбоя интернета вы сможете продолжить.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}