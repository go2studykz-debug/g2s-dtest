import 'dotenv/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import Anthropic from '@anthropic-ai/sdk';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BATCH = 15;

const TESTS = [
  { classNum: 4, lang: 'ru' },
  { classNum: 4, lang: 'kz' },
  { classNum: 5, lang: 'ru' },
  { classNum: 5, lang: 'kz' },
  { classNum: 6, lang: 'ru' },
  { classNum: 6, lang: 'kz' },
];

async function generateTopics(classNum: number, lang: string) {
  const snapshot = await getDocs(collection(db, 'questions'));
  const questions = snapshot.docs
    .map(d => ({ docId: d.id, ...(d.data() as any) }))
    .filter(q => q.class_number === classNum && q.language === lang)
    .sort((a: any, b: any) => a.question_number - b.question_number);

  if (!questions.length) {
    console.log(`  [${classNum}-${lang}] Нет вопросов, пропускаем`);
    return;
  }

  console.log(`  [${classNum}-${lang}] ${questions.length} вопросов`);
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    const list = batch.map((q: any) => {
      let text = q.question_text || '';
      if (q.subject === 'quantitative') {
        const parts = text.split('|||');
        text = `A=${parts[0]?.trim()}, B=${parts[1]?.trim()}`;
      } else {
        text = text.replace(/<[^>]+>/g, '').slice(0, 150);
      }
      return `Q${q.question_number} [${q.subject}]: ${text}`;
    }).join('\n');

    const prompt = `Ты — эксперт по учебным программам НИШ Казахстана. Для каждого вопроса ниже напиши КРАТКОЕ название темы на русском языке (3–6 слов максимум). Только название темы, без пояснений.

Верни ТОЛЬКО валидный JSON массив в таком формате:
[{"n": <question_number>, "topic": "<тема>"}]

Вопросы:
${list}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: 'Отвечай ТОЛЬКО валидным JSON массивом без markdown и пояснений.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text ?? '';
    const jsonText = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let results: Array<{ n: number; topic: string }>;
    try {
      results = JSON.parse(jsonText);
    } catch (e) {
      console.error(`  Ошибка парсинга JSON для батча ${i / BATCH + 1}:`, raw.slice(0, 200));
      skipped += batch.length;
      continue;
    }

    for (const r of results) {
      const q = batch.find((q: any) => q.question_number === r.n);
      if (!q || !r.topic) { skipped++; continue; }
      await updateDoc(doc(db, 'questions', q.docId), { topic: r.topic });
      updated++;
      process.stdout.write(`    Q${r.n}: ${r.topic}\n`);
    }
  }

  console.log(`  [${classNum}-${lang}] Готово: обновлено ${updated}, пропущено ${skipped}\n`);
}

async function main() {
  console.log('=== Генерация тем для всех тестов ===\n');
  for (const { classNum, lang } of TESTS) {
    console.log(`\n--- ${classNum} класс, ${lang} ---`);
    await generateTopics(classNum, lang);
  }
  console.log('\n=== Все темы сгенерированы ===');
  process.exit(0);
}

main().catch(e => {
  console.error('Ошибка:', e);
  process.exit(1);
});
