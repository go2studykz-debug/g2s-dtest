
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle, GraduationCap } from 'lucide-react';
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
          const { questions: qs } = await import('@/app/lib/actions').then(m => m.startTest({
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
          title: 'Внимание',
          description: 'Пожалуйста, не переключайте вкладки во время теста.',
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
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#14bf96]" />
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      {/* Academy Header */}
      <header className="bg-white border-b border-[#e3e8ee] px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#14bf96]" />
          <span className="text-xl font-bold tracking-tight text-[#081d3a]">
            go2study
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#3b3e40] font-bold">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
          </div>
          <Button 
            variant="outline" 
            className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold hidden md:flex"
            onClick={handleFinish}
          >
            Сдать тест
          </Button>
        </div>
      </header>

      <div className="h-1.5 w-full bg-[#e3e8ee]">
        <div 
          className="h-full bg-[#14bf96] transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-[#e3e8ee] p-6 md:p-10 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#3b3e40]/60 uppercase tracking-widest">Вопрос {currentIndex + 1} из {questions.length}</p>
                  <h3 className="text-[#14bf96] font-bold text-sm uppercase tracking-wider">{currentQuestion.subject === 'math' ? 'Математика' : currentQuestion.subject === 'logic' ? 'Логика' : currentQuestion.subject}</h3>
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
                        "flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer",
                        isSelected 
                          ? "border-[#14bf96] bg-[#f0f9f7]" 
                          : "border-[#f0f1f2] hover:border-[#e3e8ee] hover:bg-[#f9fafb]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 transition-colors",
                        isSelected 
                          ? "bg-[#14bf96] text-white border-[#14bf96]" 
                          : "bg-white text-[#3b3e40] border-[#e3e8ee]"
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
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Назад
              </Button>

              <div className="flex gap-4">
                {currentIndex === questions.length - 1 ? (
                  <Button 
                    className="h-12 px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-sm"
                    onClick={handleFinish} 
                    disabled={isFinishing}
                  >
                    Завершить тест <Send className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    className="h-12 px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-sm"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
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
            <h3 className="text-xs font-bold text-[#081d3a]/60 uppercase tracking-widest mb-6">Ваш прогресс</h3>
            
            <div className="grid grid-cols-5 gap-3 mb-8">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border-2",
                      isCurrent 
                        ? "border-[#14bf96] text-[#14bf96] ring-2 ring-[#14bf96]/10" 
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
              <div className="flex items-center gap-3 text-xs font-bold text-[#3b3e40]/60 uppercase">
                <div className="w-3 h-3 rounded bg-[#14bf96]" />
                <span>Отвечено</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-[#3b3e40]/60 uppercase">
                <div className="w-3 h-3 rounded border-2 border-[#f0f1f2] bg-white" />
                <span>Пропущено</span>
              </div>
            </div>

            <Button 
              className="w-full mt-8 bg-white border-2 border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold"
              onClick={handleFinish}
            >
              Завершить досрочно
            </Button>
          </div>
          
          <div className="bg-[#f0f9f7] p-4 rounded-xl border border-[#14bf96]/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#14bf96] shrink-0 mt-0.5" />
            <p className="text-xs text-[#081d3a]/70 leading-relaxed">
              Не волнуйтесь, ваш прогресс сохраняется автоматически после каждого ответа.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
