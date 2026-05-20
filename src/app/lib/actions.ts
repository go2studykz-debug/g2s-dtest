
'use server';

import { 
  StudentResult, 
  Question, 
  StudentAnswer, 
  AntiCheatLog, 
  AIAnalysis,
  Test,
  Subject,
  Language
} from './types';
import { analyzeStudentResult } from '@/ai/flows/admin-ai-result-analysis';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  addDoc,
  Timestamp,
  serverTimestamp,
  limit,
  Firestore
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

/**
 * Хелпер для получения инстанса Firestore внутри серверного экшена.
 */
function getDb(): Firestore {
  const { firestore } = initializeFirebase();
  return firestore;
}

/**
 * Глубокая сериализация данных для Next.js 15.
 */
function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
      return new Date(value.seconds * 1000).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

/**
 * Инициализирует демонстрационные данные, если база пуста.
 */
async function ensureSampleData() {
  const db = getDb();
  try {
    const testId = 'test-1';
    const testDoc = await getDoc(doc(db, 'tests', testId));
    
    if (!testDoc.exists()) {
      console.log("Initializing fixed sample data for test-1...");
      const sampleTest = {
        name: 'Вступительная диагностика НИШ (Математика и Логика)',
        class_number: 6,
        language: 'ru',
        is_active: true,
        total_time_minutes: 60,
        blocks: [
          { subject: 'math', question_count: 3, time_limit_minutes: 30 },
          { subject: 'logic', question_count: 3, time_limit_minutes: 30 }
        ],
        created_at: serverTimestamp()
      };
      
      await setDoc(doc(db, 'tests', testId), sampleTest);

      const sampleQuestions = [
        // МАТЕМАТИКА
        {
          test_id: testId,
          question_number: 1,
          subject: 'math',
          question_text: 'Решите уравнение: 2x + 5 = 15',
          option_a: '3',
          option_b: '5',
          option_c: '10',
          option_d: '7',
          option_e: '4',
          correct_answer: 'B',
          class_number: 6,
          language: 'ru'
        },
        {
          test_id: testId,
          question_number: 2,
          subject: 'math',
          question_text: 'Чему равен квадратный корень из числа 144?',
          option_a: '10',
          option_b: '12',
          option_c: '14',
          option_d: '16',
          option_e: '11',
          correct_answer: 'B',
          class_number: 6,
          language: 'ru'
        },
        {
          test_id: testId,
          question_number: 3,
          subject: 'math',
          question_text: 'Вычислите: (15 + 25) / 5 * 2',
          option_a: '16',
          option_b: '8',
          option_c: '20',
          option_d: '12',
          option_e: '10',
          correct_answer: 'A',
          class_number: 6,
          language: 'ru'
        },
        // ЛОГИКА
        {
          test_id: testId,
          question_number: 4,
          subject: 'logic',
          question_text: 'Какое число должно быть следующим в последовательности: 2, 4, 8, 16, ...?',
          option_a: '24',
          option_b: '30',
          option_c: '32',
          option_d: '64',
          option_e: '48',
          correct_answer: 'C',
          class_number: 6,
          language: 'ru'
        },
        {
          test_id: testId,
          question_number: 5,
          subject: 'logic',
          question_text: 'Если все коты — животные, а Барсик — кот, то какой вывод является верным?',
          option_a: 'Барсик — животное',
          option_b: 'Все животные — коты',
          option_c: 'Барсик — не животное',
          option_d: 'Коты не являются животными',
          option_e: 'Барсик — собака',
          correct_answer: 'A',
          class_number: 6,
          language: 'ru'
        },
        {
          test_id: testId,
          question_number: 6,
          subject: 'logic',
          question_text: 'Укажите лишнее слово в списке: Яблоко, Груша, Банан, Морковь, Персик.',
          option_a: 'Яблоко',
          option_b: 'Груша',
          option_c: 'Банан',
          option_d: 'Морковь',
          option_e: 'Персик',
          correct_answer: 'D',
          class_number: 6,
          language: 'ru'
        }
      ];

      for (const q of sampleQuestions) {
        const qId = `q-${testId}-${q.question_number}`;
        await setDoc(doc(db, 'questions', qId), q);
      }
      console.log("Fixed sample data initialization complete.");
    }
  } catch (error) {
    console.error("Critical error during data initialization:", error);
  }
}

export async function getTests(): Promise<Test[]> {
  const db = getDb();
  try {
    await ensureSampleData();
    const querySnapshot = await getDocs(collection(db, 'tests'));
    const tests = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    return serializeData(tests) as any;
  } catch (e) {
    console.error("Error fetching tests:", e);
    return [];
  }
}

export async function getTestById(id: string): Promise<Test | null> {
  const db = getDb();
  try {
    const docSnap = await getDoc(doc(db, 'tests', id));
    if (docSnap.exists()) {
      return serializeData({ id: docSnap.id, ...docSnap.data() }) as any;
    }
  } catch (e) {
    console.error("Error fetching test by id:", e);
  }
  return null;
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  const db = getDb();
  try {
    const querySnapshot = await getDocs(collection(db, 'questions'));
    const qs = querySnapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Question))
      .filter(q => q.test_id === testId);
    
    return serializeData(qs.sort((a, b) => a.question_number - b.question_number));
  } catch (e) {
    console.error("Error fetching questions:", e);
    return [];
  }
}

export async function getQuestions(classNum?: number, lang?: string): Promise<Question[]> {
  const db = getDb();
  try {
    const querySnapshot = await getDocs(collection(db, 'questions'));
    let qs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
    
    if (classNum) qs = qs.filter(q => (q as any).class_number === classNum);
    if (lang) qs = qs.filter(q => (q as any).language === lang);
    
    return serializeData(qs.sort((a, b) => a.question_number - b.question_number));
  } catch (e) {
    console.error("Error fetching questions:", e);
    return [];
  }
}

export async function startTest(data: {
  testId: string;
  name: string;
  city: string;
  whatsapp: string;
  classNumber: number;
  language: 'kk' | 'ru';
}) {
  const db = getDb();
  try {
    await ensureSampleData();
    const questions = await getQuestionsByTestId(data.testId);
    
    if (questions.length === 0) {
      throw new Error("Вопросы для этого теста еще не добавлены. Пожалуйста, обратитесь к администрации.");
    }

    const resultData = {
      test_id: data.testId,
      student_name: data.name,
      student_city: data.city,
      parent_whatsapp: data.whatsapp,
      class_number: data.classNumber,
      language: data.language,
      status: 'in_progress',
      total_correct: 0,
      total_questions: questions.length,
      percentage: 0,
      total_score: 0,
      started_at: serverTimestamp(),
      is_analysed: false,
      anti_cheat_count: 0,
      is_contacted: false,
      is_consulted: false,
    };

    const docRef = await addDoc(collection(db, 'results'), resultData);
    const secureQuestions = questions.map(({ correct_answer, ...q }) => q as Question);
    
    return serializeData({ 
      result: { id: docRef.id, ...resultData, started_at: new Date().toISOString() }, 
      questions: secureQuestions 
    });
  } catch (error: any) {
    console.error("Failed to start test:", error);
    throw new Error(error.message || "Ошибка при подключении к базе данных.");
  }
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const db = getDb();
  try {
    const qSnap = await getDoc(doc(db, 'questions', data.questionId));
    if (!qSnap.exists()) return;
    const question = qSnap.data() as Question;

    const answerRef = doc(db, 'results', data.resultId, 'answers', data.questionId);
    const answerSnap = await getDoc(answerRef);

    let totalTime = data.timeSpent;
    if (answerSnap.exists()) {
      totalTime += (answerSnap.data().time_spent_seconds || 0);
    }

    const studentAnswer = {
      result_id: data.resultId,
      question_id: data.questionId,
      question_number: question.question_number,
      subject: question.subject,
      student_answer: data.answer,
      correct_answer: question.correct_answer || '',
      is_correct: data.answer === question.correct_answer,
      time_spent_seconds: totalTime,
      updated_at: serverTimestamp()
    };

    await setDoc(answerRef, studentAnswer);
    return { success: true };
  } catch (e) {
    console.error("Error submitting answer:", e);
    return { success: false };
  }
}

export async function finishTest(resultId: string): Promise<StudentResult> {
  const db = getDb();
  try {
    const resultRef = doc(db, 'results', resultId);
    const resultSnap = await getDoc(resultRef);
    if (!resultSnap.exists()) throw new Error('Result not found');
    
    const answersSnap = await getDocs(collection(db, 'results', resultId, 'answers'));
    const answers = answersSnap.docs.map(d => d.data());
    const correctCount = answers.filter(a => a.is_correct).length;
    
    const totalQuestions = resultSnap.data().total_questions || 0;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const updateData = {
      status: 'completed',
      completed_at: serverTimestamp(),
      total_correct: correctCount,
      percentage: percentage,
      total_score: correctCount * 10
    };

    await updateDoc(resultRef, updateData);
    const finalSnap = await getDoc(resultRef);
    return serializeData({ id: resultId, ...finalSnap.data() }) as any;
  } catch (error: any) {
    console.error("Error finishing test:", error);
    throw new Error("Не удалось завершить тест.");
  }
}

export async function getResultDetail(id: string) {
  const db = getDb();
  try {
    const resultSnap = await getDoc(doc(db, 'results', id));
    if (!resultSnap.exists()) return null;

    const answersSnap = await getDocs(collection(db, 'results', id, 'answers'));
    const logsSnap = await getDocs(collection(db, 'results', id, 'logs'));
    
    const resultData = resultSnap.data();
    const result = { id: resultSnap.id, ...resultData };
    const questions = await getQuestionsByTestId(result.test_id as string);

    return serializeData({ 
      result, 
      answers: answersSnap.docs.map(d => ({ id: d.id, ...d.data() })), 
      logs: logsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      testQuestions: questions 
    });
  } catch (e) {
    console.error("Error getting result detail:", e);
    return null;
  }
}

export async function getAllResults() {
  const db = getDb();
  try {
    const qSnapshot = await getDocs(collection(db, 'results'));
    const results = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return serializeData(results) as any;
  } catch (e) {
    console.error("Error getting all results:", e);
    return [];
  }
}

export async function updateResultCRM(id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) {
  const db = getDb();
  try {
    await updateDoc(doc(db, 'results', id), updates);
    return { id, ...updates };
  } catch (e) {
    console.error("Error updating CRM:", e);
    throw e;
  }
}

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
  const db = getDb();
  try {
    const resultRef = doc(db, 'results', data.resultId);
    const resultSnap = await getDoc(resultRef);
    if (!resultSnap.exists() || resultSnap.data().status === 'completed') return;

    const log = {
      result_id: data.resultId,
      event_type: data.eventType,
      question_number: data.questionNumber,
      exit_duration_seconds: data.duration,
      details: data.details,
      created_at: serverTimestamp(),
    };

    await addDoc(collection(db, 'results', data.resultId, 'logs'), log);
    await updateDoc(resultRef, {
      anti_cheat_count: (resultSnap.data().anti_cheat_count || 0) + 1
    });

    return { success: true };
  } catch (e) {
    console.error("Error logging anti-cheat:", e);
  }
}

export async function analyzeResult(resultId: string) {
  const db = getDb();
  try {
    const detail = await getResultDetail(resultId);
    if (!detail || detail.result.status !== 'completed') throw new Error('Result not ready');

    const analysisInput = {
      studentName: detail.result.student_name as string,
      classNumber: detail.result.class_number as number,
      percentage: detail.result.percentage as number,
      totalCorrect: detail.result.total_correct as number,
      totalQuestions: detail.result.total_questions as number,
      answers: detail.testQuestions.map((q: any) => {
        const answer = (detail.answers as any[]).find(a => a.question_id === q.id);
        return {
          questionNumber: q.question_number,
          subject: q.subject,
          questionText: q.question_text,
          studentAnswer: answer?.student_answer || null,
          correctAnswer: q.correct_answer || '',
          isCorrect: answer ? answer.is_correct : false,
          timeSpentSeconds: answer ? answer.time_spent_seconds : 0,
        };
      }),
      antiCheatLogs: (detail.logs as any[]).map(l => ({
        eventType: l.event_type,
        questionNumber: l.question_number,
        exit_duration_seconds: l.exit_duration_seconds,
        details: l.details,
        createdAt: l.created_at,
      })),
    };

    const analysis = await analyzeStudentResult(analysisInput);
    const ai_analysis = {
      analysis_json: analysis,
      student_name: detail.result.student_name,
      class_number: detail.result.class_number,
      percentage: detail.result.percentage,
    };
    await updateDoc(doc(db, 'results', resultId), {
      is_analysed: true,
      ai_analysis: serializeData(ai_analysis)
    });
    return serializeData(ai_analysis);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
}

export async function saveTest(test: Test): Promise<Test> {
  const db = getDb();
  try {
    const { id, ...data } = test;
    await setDoc(doc(db, 'tests', id), { ...data, created_at: serverTimestamp() }, { merge: true });
    return serializeData(test);
  } catch (e) {
    console.error("Error saving test:", e);
    throw e;
  }
}

export async function saveQuestion(question: Question): Promise<Question> {
  const db = getDb();
  try {
    const { id, ...data } = question;
    const testSnap = await getDoc(doc(db, 'tests', question.test_id));
    const testData = testSnap.data();
    
    await setDoc(doc(db, 'questions', id), { 
      ...data, 
      class_number: testData?.class_number || 4,
      language: testData?.language || 'ru'
    }, { merge: true });
    return serializeData(question);
  } catch (e) {
    console.error("Error saving question:", e);
    throw e;
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = getDb();
  try {
    await deleteDoc(doc(db, 'questions', id));
  } catch (e) {
    console.error("Error deleting question:", e);
    throw e;
  }
}
