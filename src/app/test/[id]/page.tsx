'use client';

import React, { useState, useEffect, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Clock, ChevronRight, ChevronLeft, Send, AlertTriangle,
  GraduationCap, ShieldAlert, Home, CheckCircle2, ArrowRight
} from 'lucide-react';
import {
  getResultDetail, submitAnswer, logAntiCheat, finishTest,
  getQuestionsByTestId, getTestById
} from '@/app/lib/actions';
import { StudentResult, Question, Test, TestBlock } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { MathText } from '@/components/ui/math-text';

const SUBJECTS_INFO: Record<string, string> = {
  math: 'Математика',
  quantitative: 'Количественные характеристики',
  logic: 'Логика',
  science: 'Естествознание',
  kazakh: 'Казахский язык',
  russian: 'Русский язык',
  english: 'Английский язык',
};

const SUBJECTS_INFO_KZ: Record<string, string> = {
  math: 'Математика',
  quantitative: 'Сандық сипаттамалар',
  logic: 'Логика',
  science: 'Жаратылыстану',
  kazakh: 'Қазақ тілі',
  russian: 'Орыс тілі',
  english: 'Ағылшын тілі',
};

interface BlockBoundary {
  start: number;
  end: number;
  subject: string;
  question_count: number;
  time_limit_minutes: number;
}

function buildBlockBoundaries(blocks: TestBlock[]): BlockBoundary[] {
  let offset = 0;
  return blocks.map(b => {
    const range: BlockBoundary = {
      start: offset,
      end: offset + b.question_count - 1,
      subject: b.subject,
      question_count: b.question_count,
      time_limit_minutes: b.time_limit_minutes,
    };
    offset += b.question_count;
    return range;
  });
}

export default function TestingInterface({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [result, setResult] = useState<StudentResult | null>(null);
  const [testInfo, setTestInfo] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showWelcome, setShowWelcome] = useState(true);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showQuantInstructions, setShowQuantInstructions] = useState(false);
  const [showBlockComplete, setShowBlockComplete] = useState(false);
  const [antiCheatCount, setAntiCheatCount] = useState(0);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number | null>(null);

  const quantInstructionsShownRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());
  const antiCheatActive = useRef(true);
  const lastHiddenTime = useRef<number | null>(null);
  const blockExpiredHandledRef = useRef<number>(-1);

  // ── Block boundaries ───────────────────────────────────────────────────────
  const blockBoundaries = useMemo<BlockBoundary[]>(() => {
    if (!testInfo?.blocks?.length || !questions.length) return [];
    return buildBlockBoundaries(testInfo.blocks);
  }, [testInfo, questions]);

  const currentBlockBoundary = blockBoundaries[currentBlockIndex];
  const blockOffset = currentBlockBoundary?.start ?? 0;

  const currentBlockQuestions = useMemo(() => {
    if (!blockBoundaries.length) return questions;
    const b = blockBoundaries[currentBlockIndex];
    if (!b) return [];
    return questions.slice(b.start, Math.min(b.end + 1, questions.length));
  }, [questions, blockBoundaries, currentBlockIndex]);

  const currentIndexInBlock = currentIndex - blockOffset;
  const isLastInBlock = currentIndexInBlock >= currentBlockQuestions.length - 1;
  const isLastBlock = blockBoundaries.length === 0 || currentBlockIndex >= blockBoundaries.length - 1;
  const nextBlockBoundary = blockBoundaries[currentBlockIndex + 1];

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await getResultDetail(id) as any;
        if (!data?.result) { setError("Сессия тестирования не найдена."); return; }

        if (data.result.status === 'completed') {
          router.push(`/test/${id}/complete`);
          return;
        }

        setResult(data.result as StudentResult);
        setAntiCheatCount(data.result.anti_cheat_count || 0);

        const t = await getTestById(data.result.test_id);
        setTestInfo(t);

        const qs = await getQuestionsByTestId(data.result.test_id);
        if (qs.length === 0) {
          setError("В данном тесте еще нет вопросов. Обратитесь к администратору.");
          return;
        }
        setQuestions(qs);

        const existingAnswers: Record<string, string> = {};
        data.answers.forEach((a: any) => {
          if (a.student_answer) existingAnswers[a.question_id] = a.student_answer;
        });
        setAnswers(existingAnswers);

        // Determine current block from elapsed time
        const elapsedSeconds = Math.floor((Date.now() - new Date(data.result.started_at).getTime()) / 1000);

        if (t?.blocks?.length && qs.length > 0) {
          const boundaries = buildBlockBoundaries(t.blocks);
          let accumulated = 0;
          let blockIdx = boundaries.length - 1;
          let bTimeLeft = 0;
          for (let i = 0; i < t.blocks.length; i++) {
            const blockSecs = t.blocks[i].time_limit_minutes * 60;
            if (elapsedSeconds < accumulated + blockSecs) {
              blockIdx = i;
              bTimeLeft = Math.max(0, accumulated + blockSecs - elapsedSeconds);
              break;
            }
            accumulated += blockSecs;
          }
          setCurrentBlockIndex(blockIdx);
          setBlockTimeLeft(bTimeLeft);
          setCurrentIndex(boundaries[blockIdx]?.start ?? 0);
        } else {
          const limitSeconds = (t?.total_time_minutes || 60) * 60;
          setBlockTimeLeft(Math.max(0, limitSeconds - elapsedSeconds));
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("Load error:", err);
        setError("Произошла ошибка при загрузке теста.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // ── Block timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (blockTimeLeft === null || blockTimeLeft <= 0 || isFinishing) return;
    const timer = setInterval(() => {
      setBlockTimeLeft(prev => {
        if (prev !== null && prev <= 1) { clearInterval(timer); return 0; }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [blockTimeLeft, isFinishing]);

  // ── Handle block timer hitting 0 ───────────────────────────────────────────
  useEffect(() => {
    if (blockTimeLeft !== 0 || loading || questions.length === 0) return;
    if (blockExpiredHandledRef.current === currentBlockIndex) return;
    blockExpiredHandledRef.current = currentBlockIndex;
    if (isLastBlock) {
      handleFinish();
    } else {
      setShowBlockComplete(true);
    }
  }, [blockTimeLeft, loading, questions.length, currentBlockIndex, isLastBlock]);

  // Reset expiry ref when block advances
  useEffect(() => {
    blockExpiredHandledRef.current = -1;
  }, [currentBlockIndex]);

  // ── Anti-cheat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !result || questions.length === 0) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && antiCheatActive.current) {
        lastHiddenTime.current = Date.now();
        logAntiCheat({
          resultId: id, eventType: 'tab_switch',
          questionNumber: questions[currentIndex]?.question_number || 0,
          duration: 0, details: 'Смена вкладки браузера (зафиксировано)'
        });
        setAntiCheatCount(prev => prev + 1);
      } else if (document.visibilityState === 'visible' && lastHiddenTime.current) {
        setShowViolationModal(true);
        lastHiddenTime.current = null;
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({ variant: 'destructive', title: 'Запрещено', description: 'Правая кнопка мыши отключена.' });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast({ variant: 'destructive', title: 'Запрещено', description: 'Данное действие заблокировано.' });
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [id, currentIndex, questions, toast, loading, result]);

  // ── Quantitative instructions ──────────────────────────────────────────────
  useEffect(() => {
    if (!questions.length || showWelcome) return;
    const q = questions[currentIndex];
    if (q?.subject === 'quantitative' && !quantInstructionsShownRef.current) {
      quantInstructionsShownRef.current = true;
      setShowQuantInstructions(true);
    }
  }, [currentIndex, questions, showWelcome]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAnswer = async (val: string) => {
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    const q = questions[currentIndex];
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    submitAnswer({ resultId: id, questionId: q.id, answer: val, timeSpent });
    questionStartRef.current = Date.now();
  };

  const handleFinish = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    antiCheatActive.current = false;
    try {
      await finishTest(id);
      router.push(`/test/${id}/complete`);
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить результат.' });
      setIsFinishing(false);
    }
  };

  const handleAdvanceBlock = () => {
    const nextIdx = currentBlockIndex + 1;
    if (nextIdx >= blockBoundaries.length) { handleFinish(); return; }
    setCurrentBlockIndex(nextIdx);
    setCurrentIndex(blockBoundaries[nextIdx].start);
    setBlockTimeLeft(blockBoundaries[nextIdx].time_limit_minutes * 60);
    setShowBlockComplete(false);
    questionStartRef.current = Date.now();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#14bf96]" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Загрузка сессии...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#081d3a]">{error}</h2>
        <Button onClick={() => router.push('/')} className="w-full h-12 bg-primary">
          <Home className="w-4 h-4 mr-2" /> Вернуться на главную
        </Button>
      </div>
    </div>
  );

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (showWelcome && result) {
    const isKz = result.language === 'kz';
    const si = isKz ? SUBJECTS_INFO_KZ : SUBJECTS_INFO;
    const tips = isKz ? [
      'Асықпаңыз және әр сұрақты мұқият оқыңыз.',
      'Есептеулер немесе жазбалар үшін қарапайым қағазды пайдалана аласыз.',
      'Барлық бөлімдерді аяқтауға жеткілікті уақытыңыз бар екенін тексеріңіз.',
      'Прокторинг жүйесі тест терезесінен әр шыққанды тіркейді.',
      'Келесі блокқа өту тек ағымдағы блокты аяқтағаннан кейін ғана мүмкін.',
    ] : [
      'Не торопитесь и внимательно читайте каждый вопрос.',
      'Вы можете использовать черновики для расчётов или заметок.',
      'Убедитесь, что у вас достаточно времени для прохождения всех разделов.',
      'Система прокторинга фиксирует каждый выход из окна теста.',
      'Переход к следующему блоку возможен только после завершения текущего.',
    ];
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-[#e3e8ee] shadow-xl p-6 sm:p-8 md:p-12 space-y-6 md:space-y-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-[#14bf96]" />
            <span className="text-xl font-bold tracking-tight text-[#081d3a]">go<span className="text-[#14bf96]">2</span>study</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#081d3a] mb-2">
              {isKz ? 'Қош келдіңіз!' : 'Добро пожаловать!'}
            </h1>
            <p className="text-[#3b3e40] text-sm sm:text-base leading-relaxed">
              {isKz
                ? 'Назарбаев Зияткерлік Мектептеріне (НЗМ) түсуге арналған дайындық тесті. Тест білімді бағалауға және қабылдау емтихандарына дайындалуға көмектеседі.'
                : 'Подготовительный тест для поступления в Назарбаев Интеллектуальные Школы (НИШ). Тест поможет оценить знания и подготовиться к вступительным экзаменам.'}
            </p>
          </div>
          <div className="bg-[#f0f9f7] rounded-2xl p-4 sm:p-6 border border-[#14bf96]/20 space-y-2">
            <h3 className="font-bold text-[#081d3a] text-sm uppercase tracking-widest mb-3">
              {isKz ? 'Маңызды ақпарат' : 'Важная информация'}
            </h3>
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-[#3b3e40]">
                <span className="text-[#14bf96] font-bold shrink-0 mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
          {testInfo?.blocks && testInfo.blocks.length > 0 && (
            <div>
              <h3 className="font-bold text-[#081d3a] text-sm uppercase tracking-widest mb-3">
                {isKz ? 'Тест құрылымы' : 'Структура теста'}
              </h3>
              <div className="border border-[#e3e8ee] rounded-xl overflow-x-auto text-xs sm:text-sm">
                <table className="w-full min-w-[280px]">
                  <thead className="bg-[#081d3a] text-white">
                    <tr>
                      <th className="p-2 sm:p-3 text-left font-bold">{isKz ? 'Блок / Бөлім' : 'Блок / Раздел'}</th>
                      <th className="p-2 sm:p-3 text-center font-bold">{isKz ? 'Сұрақтар' : 'Вопросов'}</th>
                      <th className="p-2 sm:p-3 text-center font-bold">{isKz ? 'Минут' : 'Минут'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testInfo.blocks.map((block, i) => (
                      <tr key={i} className={cn("border-t border-[#f0f1f2]", i % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]')}>
                        <td className="p-2 sm:p-3 font-medium">{si[block.subject] || block.subject}</td>
                        <td className="p-2 sm:p-3 text-center font-bold text-[#14bf96]">{block.question_count}</td>
                        <td className="p-2 sm:p-3 text-center text-[#3b3e40]">{block.time_limit_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Button
            className="w-full h-12 sm:h-14 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold text-base sm:text-lg rounded-xl shadow-lg"
            onClick={() => setShowWelcome(false)}
          >
            {isKz ? 'Тестті бастау' : 'Начать тест'} <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const isKz = result?.language === 'kz';
  const si = isKz ? SUBJECTS_INFO_KZ : SUBJECTS_INFO;
  const isQuantitative = currentQuestion.subject === 'quantitative';
  const isLanguageSubject = ['kazakh', 'russian', 'english'].includes(currentQuestion.subject);
  const quantParts = isQuantitative ? currentQuestion.question_text.split('|||') : null;
  // Format: "condition|||colA|||colB" (3 parts) or "colA|||colB" (2 parts, no condition)
  const hasCondition = (quantParts?.length ?? 0) >= 3;
  const quantCondition = hasCondition ? quantParts![0].trim() : null;
  const columnA = hasCondition ? quantParts![1].trim() : (quantParts?.[0]?.trim() ?? '');
  const columnB = hasCondition ? quantParts![2].trim() : (quantParts?.[1]?.trim() ?? '');

  const blockProgress = blockBoundaries.length > 0
    ? `Блок ${currentBlockIndex + 1}/${blockBoundaries.length} · ${currentIndexInBlock + 1}/${currentBlockQuestions.length}`
    : `${currentIndex + 1}/${questions.length}`;

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col select-none">
      {/* Anti-cheat violation modal */}
      <Dialog open={showViolationModal} onOpenChange={setShowViolationModal}>
        <DialogContent className="max-w-md bg-red-600 border-none text-white overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse" />
          <DialogHeader className="pt-6">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-white">
              {isKz ? 'НАЗАР АУДАРЫҢЫЗ! БҰЗУШЫЛЫҚ' : 'ВНИМАНИЕ! НАРУШЕНИЕ'}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-center text-lg mt-4 leading-relaxed">
              {isKz
                ? 'Тест терезесінен шығу қатаң тыйым салынған. Инцидент тіркеліп, go2study әкімшілігіне жіберілді.'
                : 'Выход из окна тестирования строго запрещён. Инцидент зафиксирован и передан администрации go2study.'}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-black/10 p-4 rounded-xl mt-4 border border-white/10">
            <p className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">
              {isKz ? 'Жалпы бұзушылықтар:' : 'Всего нарушений:'}
            </p>
            <p className="text-3xl font-bold">{antiCheatCount}</p>
          </div>
          <DialogFooter className="mt-8 flex-col sm:flex-col gap-3">
            <Button className="w-full h-14 bg-white text-red-600 hover:bg-white/90 font-bold text-lg rounded-xl shadow-xl"
              onClick={() => setShowViolationModal(false)}>
              {isKz ? 'Түсінемін, тестті жалғастыру' : 'Я понимаю, продолжить тест'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantitative instructions */}
      <Dialog open={showQuantInstructions} onOpenChange={() => setShowQuantInstructions(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#081d3a]">
              {isKz ? 'Сандық сипаттамалар' : 'Количественные характеристики'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm text-[#3b3e40]">
            {isKz ? (
              <>
                <p>Әр сұрақ екі бөліктен тұрады. Бірінші бөлік — <strong>А бағанасында</strong>, екінші бөлік — <strong>В бағанасында</strong>.</p>
                <p>Қай бағанадағы мән үлкен екенін немесе олардың тең екенін анықтаңыз. Жауапты таңдаңыз:</p>
                <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2 border border-[#e3e8ee]">
                  {[['A','А бағанасындағы мән үлкен'],['B','В бағанасындағы мән үлкен'],['C','екі мән де тең'],['D','анықтауға ақпарат жеткіліксіз']].map(([l,t]) => (
                    <p key={l}><span className="font-bold text-[#14bf96]">{l}</span> — {t}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic bg-amber-50 p-3 rounded-lg border border-amber-100">
                  Ескерту: x, y, z әріптері сандарды білдіреді. Егер бір әріп екі бағанада болса — ол бір санды білдіреді.
                </p>
              </>
            ) : (
              <>
                <p>Каждый вопрос состоит из двух частей. Первая часть — в <strong>Колонке A</strong>, вторая — в <strong>Колонке B</strong>.</p>
                <p>Определите, в какой колонке значение больше, или равны ли они. Выберите ответ:</p>
                <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2 border border-[#e3e8ee]">
                  {[['A','значение в Колонке A больше'],['B','значение в Колонке B больше'],['C','оба значения равны между собой'],['D','недостаточно информации для определения']].map(([l,t]) => (
                    <p key={l}><span className="font-bold text-[#14bf96]">{l}</span> — если {t}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic bg-amber-50 p-3 rounded-lg border border-amber-100">
                  Примечание: буквы x, y, z обозначают числа. Если одна и та же буква присутствует в обеих колонках — она означает одно и то же число.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button className="w-full bg-[#14bf96] hover:bg-[#11a381] h-12 font-bold"
              onClick={() => setShowQuantInstructions(false)}>
              {isKz ? 'Түсінікті, тестті жалғастыру' : 'Понятно, продолжить тест'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block complete transition */}
      <Dialog open={showBlockComplete} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onInteractOutside={e => e.preventDefault()}>
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-[#f0f9f7] rounded-full flex items-center justify-center mx-auto border-4 border-[#14bf96]/20">
              <CheckCircle2 className="w-10 h-10 text-[#14bf96]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#081d3a]">
                {blockTimeLeft === 0
                  ? (isKz ? 'Блок уақыты аяқталды!' : 'Время блока истекло!')
                  : (isKz ? 'Блок аяқталды!' : 'Блок завершён!')}
              </h2>
              <p className="text-muted-foreground mt-1">
                {si[currentBlockBoundary?.subject || ''] || ''} · {currentBlockBoundary?.question_count} {isKz ? 'сұрақ' : 'вопросов'}
              </p>
            </div>
            {nextBlockBoundary && (
              <div className="bg-[#f0f9f7] rounded-2xl p-5 border border-[#14bf96]/20 text-left space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[#14bf96]">{isKz ? 'Келесі блок' : 'Следующий блок'}</p>
                <p className="font-bold text-[#081d3a] text-lg">{si[nextBlockBoundary.subject] || nextBlockBoundary.subject}</p>
                <p className="text-sm text-muted-foreground">{nextBlockBoundary.question_count} {isKz ? 'сұрақ' : 'вопросов'} · {nextBlockBoundary.time_limit_minutes} {isKz ? 'минут' : 'минут'}</p>
              </div>
            )}
            <Button className="w-full h-12 bg-[#14bf96] hover:bg-[#11a381] font-bold" onClick={handleAdvanceBlock}>
              {isKz ? 'Келесі блокқа өту' : 'Перейти к следующему блоку'} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white border-b border-[#e3e8ee] px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-[#14bf96]" />
          <span className="text-xl font-bold tracking-tight text-[#081d3a]">go<span className="text-primary">2</span>study</span>
          {blockBoundaries.length > 1 && (
            <span className="hidden md:inline-flex items-center text-xs font-bold bg-[#f0f9f7] text-[#14bf96] border border-[#14bf96]/20 px-3 py-1 rounded-full ml-2">
              {si[currentBlockBoundary?.subject || ''] || ''} · Блок {currentBlockIndex + 1}/{blockBoundaries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className={cn("w-2 h-2 rounded-full", antiCheatCount > 0 ? "bg-red-500 animate-pulse" : "bg-green-500")} />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Прокторинг: {antiCheatCount}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors",
            (blockTimeLeft || 0) < 60 ? "bg-red-50 text-red-500 animate-pulse" :
            (blockTimeLeft || 0) < 300 ? "bg-orange-50 text-orange-500" : "bg-muted/50 text-[#3b3e40]"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">{formatTime(blockTimeLeft || 0)}</span>
          </div>
          {isLastBlock && (
            <Button variant="outline"
              className="border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold hidden md:flex"
              onClick={handleFinish} disabled={isFinishing}>
              {isFinishing ? (isKz ? 'Тапсырылуда...' : 'Сдача...') : (isKz ? 'Тестті тапсыру' : 'Сдать тест')}
            </Button>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-[#e3e8ee]">
        <div className="h-full bg-[#14bf96] transition-all duration-500 ease-out"
          style={{ width: `${currentBlockQuestions.length > 0 ? ((currentIndexInBlock + 1) / currentBlockQuestions.length) * 100 : 0}%` }} />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-3 sm:p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-10">
        {/* Question area */}
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl border border-[#e3e8ee] p-4 sm:p-6 md:p-10 shadow-sm flex flex-col justify-between min-h-[420px] sm:min-h-[500px]">
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-[#3b3e40]/40 uppercase tracking-[0.2em]">{blockProgress}</p>
                  <h3 className="text-[#14bf96] font-bold text-xs uppercase tracking-widest">
                    {si[currentQuestion.subject] || currentQuestion.subject}
                  </h3>
                </div>
              </div>

              {currentQuestion.image_url && !isQuantitative && (
                <div className="rounded-xl overflow-hidden border border-[#e3e8ee] bg-[#f9fafb]">
                  <img
                    src={currentQuestion.image_url}
                    alt="Иллюстрация к вопросу"
                    className="max-w-full w-full object-contain max-h-64"
                  />
                </div>
              )}

              {isQuantitative ? (
                <div className="space-y-2">
                  <div className="border-2 border-[#e3e8ee] rounded-2xl overflow-hidden">
                    {/* Condition row — spans full width, shows image and/or text */}
                    {(quantCondition || currentQuestion.image_url) && (
                      <div className="px-6 py-4 text-center bg-white border-b-2 border-[#e3e8ee] space-y-3">
                        {currentQuestion.image_url && (
                          <img
                            src={currentQuestion.image_url}
                            alt="Иллюстрация к вопросу"
                            className="max-w-full mx-auto object-contain max-h-48"
                          />
                        )}
                        {quantCondition && (
                          <MathText className="text-base md:text-lg font-medium text-[#081d3a]">{quantCondition}</MathText>
                        )}
                      </div>
                    )}
                    {/* Two columns: A and B */}
                    <div className="grid grid-cols-2 divide-x-2 divide-[#e3e8ee]">
                      <div className="p-4 md:p-8 text-center bg-[#f9fafb]">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">{isKz ? 'А бағаны' : 'Колонка A'}</p>
                        <MathText className="text-xs sm:text-base md:text-2xl font-medium text-[#081d3a] font-mono leading-relaxed break-words">{columnA}</MathText>
                      </div>
                      <div className="p-4 md:p-8 text-center bg-[#f9fafb]">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">{isKz ? 'В бағаны' : 'Колонка B'}</p>
                        <MathText className="text-xs sm:text-base md:text-2xl font-medium text-[#081d3a] font-mono leading-relaxed break-words">{columnB}</MathText>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cn("font-normal text-[#081d3a] leading-relaxed break-words whitespace-pre-wrap overflow-x-auto", isLanguageSubject ? "text-sm md:text-base" : "text-lg md:text-xl")}>
                  <MathText>{currentQuestion.question_text}</MathText>
                </div>
              )}

              <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswer} className="grid gap-3">
                {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                  const optionValue = (currentQuestion as any)[`option_${letter.toLowerCase()}`] as string | undefined;
                  if (!optionValue?.trim()) return null;
                  const isSelected = answers[currentQuestion.id] === letter;
                  return (
                    <Label key={letter} className={cn(
                      "flex items-start gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer group",
                      isSelected ? "border-[#14bf96] bg-[#f0f9f7] shadow-sm" : "border-[#f0f1f2] hover:border-[#e3e8ee] hover:bg-[#f9fafb]"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 transition-all mt-0.5",
                        isSelected ? "bg-[#14bf96] text-white border-[#14bf96]" : "bg-white text-[#3b3e40] border-[#e3e8ee] group-hover:border-primary"
                      )}>{letter}</div>
                      <div className="flex-1 min-w-0 overflow-x-auto">
                        <MathText className="text-base font-normal text-[#081d3a] leading-relaxed">{optionValue}</MathText>
                      </div>
                      <RadioGroupItem value={letter} className="sr-only" />
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between pt-6 sm:pt-10 border-t border-[#f0f1f2] mt-6 sm:mt-10">
              <Button variant="ghost" className="h-10 sm:h-12 px-4 sm:px-6 text-[#3b3e40] font-bold text-sm sm:text-base"
                onClick={() => { setCurrentIndex(prev => Math.max(blockOffset, prev - 1)); questionStartRef.current = Date.now(); }}
                disabled={currentIndexInBlock === 0}>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> {isKz ? 'Артқа' : 'Назад'}
              </Button>
              <div className="flex gap-2 sm:gap-3">
                {isLastInBlock ? (
                  isLastBlock ? (
                    <Button className="h-10 sm:h-12 px-5 sm:px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-lg text-sm sm:text-base"
                      onClick={handleFinish} disabled={isFinishing}>
                      {isFinishing ? '...' : (isKz ? 'Тестті аяқтау' : 'Завершить тест')} <Send className="ml-2 w-4 h-4" />
                    </Button>
                  ) : (
                    <Button className="h-10 sm:h-12 px-5 sm:px-8 bg-[#081d3a] hover:bg-[#0a2547] text-white font-bold rounded-lg shadow-lg text-sm sm:text-base"
                      onClick={() => setShowBlockComplete(true)}>
                      {isKz ? 'Блокты аяқтау' : 'Завершить блок'} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )
                ) : (
                  <Button className="h-10 sm:h-12 px-5 sm:px-8 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold rounded-lg shadow-sm text-sm sm:text-base"
                    onClick={() => { setCurrentIndex(prev => Math.min(blockOffset + currentBlockQuestions.length - 1, prev + 1)); questionStartRef.current = Date.now(); }}>
                    {isKz ? 'Келесі' : 'Далее'} <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl border border-[#e3e8ee] p-4 sm:p-6 shadow-sm lg:sticky lg:top-24">
            <h3 className="text-[10px] font-black text-[#081d3a]/40 uppercase tracking-[0.2em] mb-2">
              {blockBoundaries.length > 1 ? `Блок ${currentBlockIndex + 1}: ${si[currentBlockBoundary?.subject || ''] || ''}` : (isKz ? 'Тест навигациясы' : 'Навигация по тесту')}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {currentIndexInBlock + 1} / {currentBlockQuestions.length} {isKz ? 'сұрақ' : 'вопросов'}
            </p>

            <div className="grid grid-cols-5 gap-2 mb-6">
              {currentBlockQuestions.map((q, localIdx) => {
                const globalIdx = blockOffset + localIdx;
                const isAnswered = !!answers[q.id];
                const isCurrent = globalIdx === currentIndex;
                return (
                  <button key={q.id}
                    onClick={() => { setCurrentIndex(globalIdx); questionStartRef.current = Date.now(); }}
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2",
                      isCurrent ? "border-[#14bf96] text-[#14bf96] ring-4 ring-[#14bf96]/5" :
                        isAnswered ? "bg-[#14bf96] border-[#14bf96] text-white" :
                          "bg-white border-[#f0f1f2] text-[#3b3e40] hover:border-[#e3e8ee]"
                    )}>
                    {localIdx + 1}
                  </button>
                );
              })}
            </div>

            {isLastBlock ? (
              <Button className="w-full bg-white border-2 border-[#14bf96] text-[#14bf96] hover:bg-[#f0f9f7] font-bold h-12"
                onClick={handleFinish} disabled={isFinishing}>
                {isFinishing ? '...' : (isKz ? 'Тестті мерзімінен бұрын аяқтау' : 'Завершить тест досрочно')}
              </Button>
            ) : (
              <Button className="w-full bg-white border-2 border-[#081d3a] text-[#081d3a] hover:bg-[#f9fafb] font-bold h-12"
                onClick={() => setShowBlockComplete(true)}>
                {isKz ? 'Блокты мерзімінен бұрын аяқтау' : 'Завершить блок досрочно'} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="bg-[#f0f9f7] p-5 rounded-xl border border-[#14bf96]/10 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#14bf96] shrink-0 mt-0.5" />
            <p className="text-xs text-[#081d3a]/70 leading-relaxed font-medium italic">
              {isKz
                ? 'Прокторинг жүйесі әр қойынды ауыстыруды тіркейді. Өтінеміз, беттен шықпаңыз.'
                : 'Система прокторинга фиксирует каждое переключение вкладки. Пожалуйста, не покидайте страницу.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
