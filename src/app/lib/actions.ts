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
  orderBy,
  addDoc,
  Timestamp,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore: db } = initializeFirebase();

function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Инициализирует демонстрационные данные, если база пуста.
 */
async function ensureSampleData() {
  const testsSnap = await getDocs(query(collection(db, 'tests'), limit(1)));
  if (testsSnap.empty) {
    const testId = 'test-1';
    const sampleTest: Test = {
      id: testId,
      name: 'Вступительная диагностика НИШ (Математика и Логика)',
      class_number: 6,
      language: 'ru',
      is_active: true,
      total_time_minutes: 60,
      blocks: [
        { subject: 'math', question_count: 2, time_limit_minutes: 30 },
        { subject: 'logic', question_count: 1, time_limit_minutes: 30 }
      ],
      created_at: new Date()
    };
    await setDoc(doc(db, 'tests', testId), { ...sampleTest, created_at: serverTimestamp() });

    const sampleQuestions = [
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
        question_text: 'Чему равен корень из 144?',
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
        subject: 'logic',
        question_text: 'Какое число следующее в последовательности: 2, 4, 8, 16, ...?',
        option_a: '24',
        option_b: '30',
        option_c: '32',
        option_d: '64',
        option_e: '48',
        correct_answer: 'C',
        class_number: 6,
        language: 'ru'
      }
    ];

    for (const q of sampleQuestions) {
      await addDoc(collection(db, 'questions'), q);
    }
  }
}

export async function getTests(): Promise<Test[]> {
  try {
    await ensureSampleData();
    const querySnapshot = await getDocs(collection(db, 'tests'));
    const tests = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate()?.toISOString() || new Date().toISOString()
    })) as any[];
    return serializeData(tests);
  } catch (e) {
    console.error("Error fetching tests:", e);
    return [];
  }
}

export async function getTestById(id: string): Promise<Test | null> {
  try {
    const docRef = doc(db, 'tests', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return serializeData({
        id: docSnap.id,
        ...data,
        created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString()
      } as any);
    }
  } catch (e) {
    console.error("Error fetching test by id:", e);
  }
  return null;
}

export async function getQuestions(classNumber: number, language: Language): Promise<Question[]> {
  try {
    const q = query(
      collection(db, 'questions'),
      where('class_number', '==', classNumber),
      where('language', '==', language),
      orderBy('question_number')
    );
    const querySnapshot = await getDocs(q);
    return serializeData(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);
  } catch (e) {
    console.error("Error fetching questions:", e);
    return [];
  }
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  try {
    const q = query(collection(db, 'questions'), where('test_id', '==', testId), orderBy('question_number'));
    const querySnapshot = await getDocs(q);
    return serializeData(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);
  } catch (e) {
    console.error("Error fetching questions by test id:", e);
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
}): Promise<{ result: StudentResult; questions: Question[] }> {
  await ensureSampleData();
  const questions = await getQuestionsByTestId(data.testId);

  if (questions.length === 0) {
    throw new Error('No questions found for this test');
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
  
  const result = { 
    id: docRef.id, 
    ...resultData, 
    started_at: new Date().toISOString() 
  } as any;
  
  const secureQuestions = questions.map(({ correct_answer, ...q }) => q as Question);
  
  return serializeData({ result, questions: secureQuestions });
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
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
  return serializeData({ success: true });
}

export async function finishTest(resultId: string): Promise<StudentResult> {
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
  
  const finalResult = { 
    id: resultId, 
    ...resultSnap.data(), 
    ...updateData,
    started_at: resultSnap.data().started_at?.toDate()?.toISOString(),
    completed_at: new Date().toISOString()
  };

  return serializeData(finalResult as any);
}

export async function getResultDetail(id: string) {
  try {
    const resultSnap = await getDoc(doc(db, 'results', id));
    if (!resultSnap.exists()) return null;

    const answersSnap = await getDocs(collection(db, 'results', id, 'answers'));
    const logsSnap = await getDocs(collection(db, 'results', id, 'logs'));
    
    const resultData = resultSnap.data();
    const result = {
      id: resultSnap.id,
      ...resultData,
      started_at: resultData.started_at?.toDate()?.toISOString() || new Date().toISOString(),
      completed_at: resultData.completed_at?.toDate()?.toISOString() || null
    };

    const questions = await getQuestionsByTestId(result.test_id);

    return serializeData({ 
      result, 
      answers: answersSnap.docs.map(d => ({ id: d.id, ...d.data() })), 
      logs: logsSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        created_at: d.data().created_at?.toDate()?.toISOString() 
      })),
      testQuestions: questions 
    });
  } catch (e) {
    console.error("Error getting result detail:", e);
    return null;
  }
}

export async function getAllResults() {
  try {
    const qSnapshot = await getDocs(query(collection(db, 'results'), orderBy('started_at', 'desc')));
    return serializeData(qSnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        started_at: data.started_at?.toDate()?.toISOString(),
        completed_at: data.completed_at?.toDate()?.toISOString()
      };
    }));
  } catch (e) {
    console.error("Error getting all results:", e);
    return [];
  }
}

export async function updateResultCRM(id: string, updates: { is_contacted?: boolean; is_consulted?: boolean }) {
  const ref = doc(db, 'results', id);
  await updateDoc(ref, updates);
  return serializeData({ id, ...updates });
}

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
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

  return serializeData({ success: true });
}

export async function analyzeResult(resultId: string) {
  const detail = await getResultDetail(resultId);
  if (!detail || detail.result.status !== 'completed') throw new Error('Result not ready');

  const analysisInput = {
    studentName: detail.result.student_name,
    classNumber: detail.result.class_number,
    percentage: detail.result.percentage,
    totalCorrect: detail.result.total_correct,
    totalQuestions: detail.result.total_questions,
    answers: detail.testQuestions.map(q => {
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

  try {
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
  const { id, ...data } = test;
  const docRef = doc(db, 'tests', id);
  await setDoc(docRef, { 
    ...data, 
    created_at: serverTimestamp() 
  }, { merge: true });
  return serializeData(test);
}

export async function saveQuestion(question: Question): Promise<Question> {
  const { id, ...data } = question;
  const docRef = doc(db, 'questions', id);
  const testSnap = await getDoc(doc(db, 'tests', question.test_id));
  const testData = testSnap.data();
  
  await setDoc(docRef, { 
    ...data, 
    class_number: testData?.class_number,
    language: testData?.language
  }, { merge: true });
  return serializeData(question);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, 'questions', id));
}
