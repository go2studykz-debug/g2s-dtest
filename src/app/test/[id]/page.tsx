
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, AlertTriangle, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { getResultDetail, submitAnswer, logAntiCheat, finishTest } from '@/app/lib/actions';
import { StudentResult, Question } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { MOCK_QUESTIONS } from '@/app/lib/mock-data';

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
        const { result: res, answers: ans } = await getResultDetail(id);
        if (res) {
          setResult(res);
          setQuestions(MOCK_QUESTIONS[res.test_id] || []);
          const existingAnswers: Record<string, string> = {};
          ans.forEach(a => {
            if (a.student_answer) existingAnswers[a.question_id] = a.student_answer;
          });
          setAnswers(existingAnswers);
        } else {
          toast({ variant: 'destructive', title: 'Ошибка', description: 'Сессия тестирования не найдена.' });
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
          details: 'Студент переключил вкладку'
        });
        toast({
          variant: 'destructive',
          title: 'Внимание: Анти-чит система',
          description: 'Переключение вкладок строго отслеживается.',
        });
      }
    };

    const handleBlur = () => {
      if (antiCheatActive.current) {
        logAntiCheat({
          resultId: id,
          eventType: 'window_blur',
          questionNumber: questions[currentIndex]?.question_number || 0,
          duration: 0,
          details: 'Студент сфокусировался на другом окне'
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
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
      toast({ variant: 'destructive', title: 'Ошибка при завершении теста' });
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading || !result || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
        <p className="text-muted-foreground animate-pulse">Загрузка диагностического интерфейса...</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const SUBJECT_MAP: Record<string, string> = {
    'math': 'Математика',
    'logic': 'Логика',
    'english': 'Английский',
    'second_lang': 'Второй язык'
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-headline font-bold text-xl text-primary">go2study</span>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground hidden md:inline">
              {result.student_name}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm font-bold tracking-wider">{formatTime(timeLeft)}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleFinish} disabled={isFinishing}>
              <Send className="w-4 h-4 mr-2" />
              Завершить
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none bg-secondary" />
      </header>

      <main className="flex-1 focus-centered-container">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="px-3 py-1 uppercase tracking-widest text-xs font-bold border-primary/50 text-primary">
              Предмет: {SUBJECT_MAP[currentQuestion.subject] || currentQuestion.subject}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              Вопрос {currentIndex + 1} из {questions.length}
            </span>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
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

                return (
                  <Label
                    key={letter}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer hover:bg-secondary/50 ${
                      answers[currentQuestion.id] === letter 
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                      : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${
                        answers[currentQuestion.id] === letter 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {letter}
                      </div>
                      <span className="text-lg">{optionValue}</span>
                    </div>
                    <RadioGroupItem value={letter} className="sr-only" />
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between pt-8">
            <Button 
              variant="outline" 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Назад
            </Button>
            
            <div className="flex gap-2">
              {questions.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-primary' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>

            {currentIndex === questions.length - 1 ? (
              <Button onClick={handleFinish} disabled={isFinishing}>
                Завершить тест <Send className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}>
                Следующий вопрос <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="p-4 flex justify-center border-t bg-secondary/30">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          <AlertTriangle className="w-3 h-3 text-accent" />
          НЕ ОБНОВЛЯЙТЕ СТРАНИЦУ. ВАШ ПРОГРЕСС СОХРАНЯЕТСЯ АВТОМАТИЧЕСКИ.
        </div>
      </footer>
    </div>
  );
}
