import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ─── Input Schema ───────────────────────────────────────────────────────────

const AnswerItemSchema = z.object({
  questionNumber: z.number(),
  subject: z.string(),
  questionText: z.string(),
  studentAnswer: z.string().nullable(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number(),
});

const AntiCheatLogSchema = z.object({
  eventType: z.string(),
  questionNumber: z.number(),
  exitDurationSeconds: z.number().optional(),
  exit_duration_seconds: z.number().optional(),
  details: z.string(),
  createdAt: z.string(),
});

const AnalyzeStudentResultInputSchema = z.object({
  studentName: z.string(),
  classNumber: z.number(),
  language: z.string().optional(),
  percentage: z.number(),
  totalCorrect: z.number(),
  totalQuestions: z.number(),
  answers: z.array(AnswerItemSchema),
  antiCheatLogs: z.array(AntiCheatLogSchema),
});

export type AnalyzeStudentResultInput = z.infer<typeof AnalyzeStudentResultInputSchema>;

// ─── Output Schema ───────────────────────────────────────────────────────────

export const AnalyzeStudentResultOutputSchema = z.object({
  performanceSummary: z.string().default(''),
  strongSides: z.array(z.object({
    direction: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
  growthZones: z.array(z.object({
    zone: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
  skillsMap: z.array(z.object({
    skill: z.string().default(''),
    subject: z.string().default(''),
    level: z.enum(['сильная зона', 'средняя зона', 'слабая зона']).catch('средняя зона'),
    examImportance: z.string().default('Среднее'),
  })).default([]),
  detailedAnalysis: z.array(z.object({
    questionNumber: z.number(),
    subject: z.string().default(''),
    topic: z.string().default(''),
    studentAnswer: z.string().nullable().default(null),
    correctAnswer: z.string().default(''),
    status: z.enum(['Ошибка', 'Пропуск']).catch('Ошибка'),
    errorType: z.string().default(''),
    timeCategory: z.string().default(''),
    examInfluence: z.string().default(''),
    recommendation: z.string().default(''),
  })).default([]),
  strategyAnalysis: z.string().default(''),
  thinkingType: z.string().default(''),
  growthPotential: z.string().default(''),
  priorityDirections: z.array(z.object({
    priority: z.number().default(1),
    direction: z.string().default(''),
    justification: z.string().default(''),
  })).default([]),
  strategicDevelopment: z.object({
    pointA: z.string().default(''),
    stages: z.array(z.object({
      name: z.string().default(''),
      period: z.string().default(''),
      content: z.string().default(''),
    })).default([]),
    pointB: z.string().default(''),
  }).default({ pointA: '', stages: [], pointB: '' }),
  conclusion: z.string().default(''),
  admissionChances: z.array(z.object({
    package: z.string(),
    rangeMin: z.number(),
    rangeMax: z.number(),
  })).optional(),
  antiCheatBehaviorAnalysis: z.string().optional(),
});

export type AnalyzeStudentResultOutput = z.infer<typeof AnalyzeStudentResultOutputSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getTimeCategory(s: number): string {
  if (s < 8) return 'Наугад (<8с)';
  if (s < 20) return 'Быстро (8–20с)';
  if (s <= 90) return 'Нормально (20–90с)';
  if (s <= 180) return 'Затруднение (90–180с)';
  return 'Очень долго (>180с)';
}

function calcAdmissionChances(classNumber: number, pct: number) {
  if (classNumber === 6) {
    let goldBase: number;
    if (pct <= 30) goldBase = 57;
    else if (pct <= 50) goldBase = 57 + (pct - 30) / 20 * 4;
    else if (pct <= 70) goldBase = 61 + (pct - 50) / 20 * 7;
    else goldBase = 68 + (pct - 70) / 30 * 5;
    const gold = clamp(Math.round(goldBase), 15, 73);

    let vipBase: number;
    if (pct <= 30) vipBase = 71;
    else if (pct <= 50) vipBase = 71 + (pct - 30) / 20 * 3;
    else if (pct <= 70) vipBase = 74 + (pct - 50) / 20 * 11;
    else vipBase = 85;
    const vip = clamp(Math.round(vipBase), 15, 85);

    return [
      { package: 'Gold · 7 уроков/нед', rangeMin: gold - 1, rangeMax: gold + 1 },
      { package: 'VIP · 9 уроков/нед', rangeMin: vip - 1, rangeMax: vip + 1 },
    ];
  }
  const noPrep = clamp(Math.round(pct * 0.50), 15, 49);
  const gold = clamp(Math.round(pct * 0.79), 15, 71);
  const vip = clamp(Math.round(pct * 0.97), 15, 85);
  return [
    { package: 'Без подготовки', rangeMin: noPrep - 1, rangeMax: noPrep + 1 },
    { package: 'Gold', rangeMin: gold - 1, rangeMax: gold + 1 },
    { package: 'VIP', rangeMin: vip - 1, rangeMax: vip + 1 },
  ];
}

function buildSubjectStats(answers: AnalyzeStudentResultInput['answers']) {
  const map: Record<string, { total: number; correct: number; wrong: number; skipped: number }> = {};
  for (const a of answers) {
    if (!map[a.subject]) map[a.subject] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
    map[a.subject].total++;
    if (a.studentAnswer === null) map[a.subject].skipped++;
    else if (a.isCorrect) map[a.subject].correct++;
    else map[a.subject].wrong++;
  }
  return Object.entries(map)
    .map(([subj, s]) => {
      const pct = Math.round((s.correct / s.total) * 100);
      return `${subj}: ${s.correct}/${s.total} (${pct}%) — ошибок: ${s.wrong}, пропусков: ${s.skipped}`;
    })
    .join('\n');
}

function buildWrongAnswers(answers: AnalyzeStudentResultInput['answers']): string {
  const wrong = answers.filter(a => !a.isCorrect);
  if (!wrong.length) return 'Все ответы верны.';
  return wrong.map(a => {
    const status = a.studentAnswer === null ? 'Пропуск' : 'Ошибка';
    const timeCat = getTimeCategory(a.timeSpentSeconds);
    const topic = (a as any).topic ? `тема:${(a as any).topic}` : `"${a.questionText.length > 80 ? a.questionText.slice(0, 80) + '…' : a.questionText}"`;
    return `Q${a.questionNumber}[${a.subject}] ${status} | ${topic} | студент:${a.studentAnswer ?? '-'} верно:${a.correctAnswer} | ${a.timeSpentSeconds}с ${timeCat}`;
  }).join('\n');
}

function buildCorrectAnswers(answers: AnalyzeStudentResultInput['answers']): string {
  const correct = answers.filter(a => a.isCorrect);
  if (!correct.length) return 'Нет верных ответов.';
  return correct.map(a => {
    const timeCat = getTimeCategory(a.timeSpentSeconds);
    const topic = (a as any).topic ? (a as any).topic : a.subject;
    return `Q${a.questionNumber}[${a.subject}] ✓ | тема:${topic} | ${a.timeSpentSeconds}с ${timeCat}`;
  }).join('\n');
}

function buildAntiCheatSummary(logs: AnalyzeStudentResultInput['antiCheatLogs']): string {
  if (!logs.length) return 'Выходов из окна теста не зафиксировано. Результат объективен.';
  const total = logs.reduce((s, l) => s + (l.exit_duration_seconds ?? l.exitDurationSeconds ?? 0), 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const lines = logs.map(l =>
    `Q${l.questionNumber}: ${l.eventType}, вне теста ${l.exit_duration_seconds ?? l.exitDurationSeconds ?? 0}с`
  ).join('\n');
  return `${logs.length} выходов из окна теста, суммарно ${mins}м ${secs}с\n${lines}`;
}

// ─── Non-AI Trackers (computed by code) ──────────────────────────────────────

function buildConfidenceDistribution(answers: AnalyzeStudentResultInput['answers']): string {
  const cats: Record<string, { total: number; correct: number }> = {
    'Наугад (<8с)': { total: 0, correct: 0 },
    'Быстро (8–20с)': { total: 0, correct: 0 },
    'Нормально (20–90с)': { total: 0, correct: 0 },
    'Затруднение (90–180с)': { total: 0, correct: 0 },
    'Очень долго (>180с)': { total: 0, correct: 0 },
  };
  for (const a of answers) {
    const cat = getTimeCategory(a.timeSpentSeconds);
    const key = Object.keys(cats).find(k => k.startsWith(cat.split(' ')[0])) ?? 'Нормально (20–90с)';
    cats[key].total++;
    if (a.isCorrect) cats[key].correct++;
  }
  return Object.entries(cats)
    .filter(([, v]) => v.total > 0)
    .map(([cat, v]) => {
      const acc = Math.round((v.correct / v.total) * 100);
      return `${cat}: ${v.total} отв., точность ${acc}%`;
    })
    .join('\n');
}

function buildSpeedAccuracy(answers: AnalyzeStudentResultInput['answers']): string {
  const fast = answers.filter(a => a.timeSpentSeconds < 20);
  const normal = answers.filter(a => a.timeSpentSeconds >= 20 && a.timeSpentSeconds <= 90);
  const slow = answers.filter(a => a.timeSpentSeconds > 90);
  const pct = (arr: typeof answers) =>
    arr.length ? Math.round((arr.filter(a => a.isCorrect).length / arr.length) * 100) : null;
  const lines: string[] = [];
  if (fast.length) lines.push(`Быстрые (<20с): ${fast.length} вопр. → точность ${pct(fast)}%`);
  if (normal.length) lines.push(`Нормальные (20–90с): ${normal.length} вопр. → точность ${pct(normal)}%`);
  if (slow.length) lines.push(`Медленные (>90с): ${slow.length} вопр. → точность ${pct(slow)}%`);
  return lines.join('\n');
}

function buildAvgTimePerSubject(answers: AnalyzeStudentResultInput['answers']): string {
  const map: Record<string, number[]> = {};
  for (const a of answers) {
    if (!map[a.subject]) map[a.subject] = [];
    map[a.subject].push(a.timeSpentSeconds);
  }
  return Object.entries(map)
    .map(([subj, times]) => {
      const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
      return `${subj}: среднее ${avg}с/вопрос`;
    })
    .join('\n');
}

function buildSerialErrors(answers: AnalyzeStudentResultInput['answers']): string {
  const sorted = [...answers].sort((a, b) => a.questionNumber - b.questionNumber);
  const streaks: string[] = [];
  let streak: typeof sorted = [];
  for (const a of sorted) {
    if (!a.isCorrect) {
      streak.push(a);
    } else {
      if (streak.length >= 3) {
        const subjects = [...new Set(streak.map(a => a.subject))].join('+');
        streaks.push(`Q${streak[0].questionNumber}–Q${streak[streak.length - 1].questionNumber} [${streak.length} подряд, ${subjects}]`);
      }
      streak = [];
    }
  }
  if (streak.length >= 3) {
    const subjects = [...new Set(streak.map(a => a.subject))].join('+');
    streaks.push(`Q${streak[0].questionNumber}–Q${streak[streak.length - 1].questionNumber} [${streak.length} подряд, ${subjects}]`);
  }
  if (!streaks.length) return 'Серийных ошибок (3+ подряд) не обнаружено.';
  return `Серии ошибок (3+ подряд):\n${streaks.join('\n')}`;
}

function buildCommonRules(grade: number): string {
  const target = grade === 6 ? '~1200 из 1500 баллов' : '~300 из 400 баллов';
  return `ПРАВИЛА АНАЛИЗА:
1. Только факты из данных — не придумывай темы задач.
2. Казахский язык — описывай через навыки чтения (основная мысль, прямая информация, вывод, авторская позиция). Не цитируй казахский текст.
3. Таймер обязателен для каждой ошибки: <8с=наугад | 8–20с=поспешил | 20–90с=норма | 90–180с=затруднение | >180с=сложная тема.
4. strategyAnalysis: используй паттерны таймера, серийность ошибок, поведение по блокам.
5. growthPotential: "высокий" / "выше среднего" / "умеренный" + конкретное обоснование.
6. strategicDevelopment.pointB: целевой ориентир — ${target}.
7. Запрещено: гарантии поступления, смайлики, эмоциональные формулировки.`;
}

function buildJsonTemplate(): string {
  return `Верни ТОЛЬКО валидный JSON без markdown и без пояснений:
{
  "performanceSummary": "2-3 предложения: общий уровень, результат по предметам, ключевые выводы",
  "strongSides": [{"direction": "название", "description": "1-2 предложения с конкретными данными"}],
  "growthZones": [{"zone": "название", "description": "1-2 предложения с конкретикой"}],
  "skillsMap": [{"skill": "конкретный навык", "subject": "предмет", "level": "сильная зона|средняя зона|слабая зона", "examImportance": "Высокое|Среднее|Низкое"}],
  "detailedAnalysis": [{"questionNumber": 0, "subject": "предмет", "topic": "тема задания", "studentAnswer": "буква или null", "correctAnswer": "буква", "status": "Ошибка|Пропуск", "errorType": "вычислительная|логическая|невнимательность|смысловая|аналитическая|пропуск", "timeCategory": "категория из таймера", "examInfluence": "1 предложение о важности", "recommendation": "1-2 предложения что делать"}],
  "strategyAnalysis": "2-3 предложения: темп, серийность ошибок, таймерные паттерны — используй данные трекеров",
  "thinkingType": "1-2 предложения: тип мышления по паттернам без психологических ярлыков",
  "growthPotential": "высокий/выше среднего/умеренный — 1-2 предложения обоснования",
  "priorityDirections": [{"priority": 1, "direction": "направление", "justification": "1-2 предложения обоснования"}, {"priority": 2, "direction": "направление", "justification": "обоснование"}, {"priority": 3, "direction": "направление", "justification": "обоснование"}],
  "strategicDevelopment": {"pointA": "1-2 предложения: текущий уровень с цифрами", "stages": [{"name": "Этап 1", "period": "мес. 1–2", "content": "содержание работы"}, {"name": "Этап 2", "period": "мес. 3–4", "content": "содержание"}, {"name": "Этап 3", "period": "мес. 5", "content": "экзаменационная стратегия"}, {"name": "Этап 4", "period": "мес. 6", "content": "стабилизация"}], "pointB": "целевой ориентир с пояснением"},
  "conclusion": "2-3 предложения: итог, сильные стороны, важность подготовки",
  "antiCheatBehaviorAnalysis": "2-3 предложения: оцени выходы из окна теста — были ли они намеренными, повлияли ли на результат, насколько объективен итог"
}`;
}

// ─── Grade-specific Prompt Builders ─────────────────────────────────────────

function buildGrade4Prompt(input: AnalyzeStudentResultInput, chances: any[]): string {
  const secondLang = input.language === 'kz' ? 'Русский язык' : 'Казахский язык';
  const chancesText = chances.map(c => `${c.package}: ${c.rangeMin}–${c.rangeMax}%`).join(' | ');
  return `Ты — аналитик образовательного центра go2study. Формируешь профессиональный аналитический отчёт по результатам пробного теста НИШ для ученика 4 класса.

СТРУКТУРА ТЕСТА (4 класс, 40 вопросов, макс. 400 баллов, 10 баллов/вопрос):
- Математика: Q1–20
- Логика: Q21–25
- Английский язык: Q26–35
- ${secondLang} (второй язык): Q36–40

ДАННЫЕ УЧЕНИКА:
Ученик: ${input.studentName} | Класс: 4 | Язык теста: ${input.language === 'kz' ? 'казахский' : 'русский'}
Результат: ${input.percentage}% (${input.totalCorrect}/${input.totalQuestions} верных)

СТАТИСТИКА ПО ПРЕДМЕТАМ:
${buildSubjectStats(input.answers)}

ВЕРНЫЕ ОТВЕТЫ (для построения карты сильных навыков):
${buildCorrectAnswers(input.answers)}

НЕВЕРНЫЕ ОТВЕТЫ С ТАЙМЕРОМ (ошибки и пропуски):
${buildWrongAnswers(input.answers)}

ТРЕКЕР: РАСПРЕДЕЛЕНИЕ УВЕРЕННОСТИ:
${buildConfidenceDistribution(input.answers)}

ТРЕКЕР: СКОРОСТЬ vs ТОЧНОСТЬ:
${buildSpeedAccuracy(input.answers)}

ТРЕКЕР: СРЕДНЕЕ ВРЕМЯ ПО ПРЕДМЕТАМ:
${buildAvgTimePerSubject(input.answers)}

ТРЕКЕР: СЕРИЙНЫЕ ОШИБКИ:
${buildSerialErrors(input.answers)}

ДИСЦИПЛИНА ПРОХОЖДЕНИЯ (Anti-Cheat):
${buildAntiCheatSummary(input.antiCheatLogs)}

ШАНСЫ НА ПОСТУПЛЕНИЕ (рассчитаны автоматически, не пересчитывать):
${chancesText}

${buildCommonRules(4)}

${buildJsonTemplate()}`;
}

function buildGrade5Prompt(input: AnalyzeStudentResultInput, chances: any[]): string {
  const secondLang = input.language === 'kz' ? 'Русский язык' : 'Казахский язык';
  const chancesText = chances.map(c => `${c.package}: ${c.rangeMin}–${c.rangeMax}%`).join(' | ');
  return `Ты — аналитик образовательного центра go2study. Формируешь профессиональный аналитический отчёт по результатам пробного теста НИШ для ученика 5 класса.

СТРУКТУРА ТЕСТА (5 класс, 40 вопросов, макс. 400 баллов, 10 баллов/вопрос):
- Математика: Q1–20
- ${secondLang} (второй язык): Q21–30
- Английский язык: Q31–40

ДАННЫЕ УЧЕНИКА:
Ученик: ${input.studentName} | Класс: 5 | Язык теста: ${input.language === 'kz' ? 'казахский' : 'русский'}
Результат: ${input.percentage}% (${input.totalCorrect}/${input.totalQuestions} верных)

СТАТИСТИКА ПО ПРЕДМЕТАМ:
${buildSubjectStats(input.answers)}

ВЕРНЫЕ ОТВЕТЫ (для построения карты сильных навыков):
${buildCorrectAnswers(input.answers)}

НЕВЕРНЫЕ ОТВЕТЫ С ТАЙМЕРОМ (ошибки и пропуски):
${buildWrongAnswers(input.answers)}

ТРЕКЕР: РАСПРЕДЕЛЕНИЕ УВЕРЕННОСТИ:
${buildConfidenceDistribution(input.answers)}

ТРЕКЕР: СКОРОСТЬ vs ТОЧНОСТЬ:
${buildSpeedAccuracy(input.answers)}

ТРЕКЕР: СРЕДНЕЕ ВРЕМЯ ПО ПРЕДМЕТАМ:
${buildAvgTimePerSubject(input.answers)}

ТРЕКЕР: СЕРИЙНЫЕ ОШИБКИ:
${buildSerialErrors(input.answers)}

ДИСЦИПЛИНА ПРОХОЖДЕНИЯ (Anti-Cheat):
${buildAntiCheatSummary(input.antiCheatLogs)}

ШАНСЫ НА ПОСТУПЛЕНИЕ (рассчитаны автоматически, не пересчитывать):
${chancesText}

${buildCommonRules(5)}

${buildJsonTemplate()}`;
}

function buildGrade6Prompt(input: AnalyzeStudentResultInput, chances: any[]): string {
  const isRus = input.language !== 'kz';
  const firstLang = isRus ? 'Русский язык' : 'Казахский язык';
  const secondLang = isRus ? 'Казахский язык' : 'Русский язык';
  const chancesText = chances.map(c => `${c.package}: ${c.rangeMin}–${c.rangeMax}%`).join(' | ');

  const examDate = new Date('2027-04-01');
  const monthsLeft = Math.round((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));

  return `Ты — аналитик образовательного центра go2study. Формируешь профессиональный аналитический отчёт по результатам пробного теста НИШ для ученика 6 класса.

СТРУКТУРА ТЕСТА (6 класс, 90 вопросов, макс. 1500 баллов):
- Математика: Q1–20 (20 вопросов × 20 баллов = 400)
- Количественные характеристики: Q21–50 (30 вопросов × 10 баллов = 300)
  Формат: сравнение А и В. A>B → ответ A, B>A → ответ B, равны → C, нельзя определить → D
- Естествознание: Q51–60 (10 вопросов × 20 баллов = 200)
- ${firstLang} (первый язык): Q61–70 (10 × 20 = 200)
- ${secondLang} (второй язык): Q71–80 (10 × 20 = 200)
- Английский язык: Q81–90 (10 × 20 = 200)
Языковой трек: ${isRus ? 'русскоязычный' : 'казахскоязычный'}

ДАННЫЕ УЧЕНИКА:
Ученик: ${input.studentName} | Класс: 6 | Трек: ${isRus ? 'рус' : 'каз'}
Результат: ${input.percentage}% (${input.totalCorrect}/${input.totalQuestions} верных)
До экзамена НИШ (1 апреля 2027): ~${monthsLeft} месяцев

СТАТИСТИКА ПО ПРЕДМЕТАМ:
${buildSubjectStats(input.answers)}

ВЕРНЫЕ ОТВЕТЫ (для построения карты сильных навыков):
${buildCorrectAnswers(input.answers)}

НЕВЕРНЫЕ ОТВЕТЫ С ТАЙМЕРОМ (ошибки и пропуски):
${buildWrongAnswers(input.answers)}

ТРЕКЕР: РАСПРЕДЕЛЕНИЕ УВЕРЕННОСТИ:
${buildConfidenceDistribution(input.answers)}

ТРЕКЕР: СКОРОСТЬ vs ТОЧНОСТЬ:
${buildSpeedAccuracy(input.answers)}

ТРЕКЕР: СРЕДНЕЕ ВРЕМЯ ПО ПРЕДМЕТАМ:
${buildAvgTimePerSubject(input.answers)}

ТРЕКЕР: СЕРИЙНЫЕ ОШИБКИ:
${buildSerialErrors(input.answers)}

ДИСЦИПЛИНА ПРОХОЖДЕНИЯ (Anti-Cheat):
${buildAntiCheatSummary(input.antiCheatLogs)}

ШАНСЫ НА ПОСТУПЛЕНИЕ (рассчитаны автоматически, не пересчитывать):
${chancesText}

${buildCommonRules(6)}

${buildJsonTemplate()}`;
}

// ─── Retry helper ────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractRetryDelay(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1])) * 1000 + 2000;
  return 30000;
}

// Пытается закрыть обрезанный JSON (когда ответ обрезан по лимиту токенов)
function repairTruncatedJson(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let result = text;
  if (inString) result += '"';
  result = result.replace(/,\s*$/, '');
  result = result.replace(/:\s*$/, ': null');
  while (stack.length > 0) result += stack.pop()!;
  return result;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function analyzeStudentResult(input: AnalyzeStudentResultInput): Promise<AnalyzeStudentResultOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const admissionChances = calcAdmissionChances(input.classNumber, input.percentage);

  let prompt: string;
  if (input.classNumber === 6) {
    prompt = buildGrade6Prompt(input, admissionChances);
  } else if (input.classNumber === 5) {
    prompt = buildGrade5Prompt(input, admissionChances);
  } else {
    prompt = buildGrade4Prompt(input, admissionChances);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: 'Ты аналитик. Отвечай ТОЛЬКО валидным JSON без markdown, без ```json, без пояснений.',
        messages: [{ role: 'user', content: prompt }],
      });
      let raw = (message.content[0] as { type: string; text: string }).text ?? '';
      let jsonText = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

      if (message.stop_reason === 'max_tokens') {
        console.warn('Ответ обрезан по лимиту токенов, пытаемся восстановить JSON...');
        jsonText = repairTruncatedJson(jsonText);
      }

      const parsed = JSON.parse(jsonText);
      parsed.admissionChances = admissionChances;

      const validation = AnalyzeStudentResultOutputSchema.safeParse(parsed);
      if (validation.success) return validation.data;

      console.error('Ошибка валидации анализа:', JSON.stringify(validation.error.errors));
      return AnalyzeStudentResultOutputSchema.parse({
        ...parsed,
        admissionChances,
        skillsMap: (parsed.skillsMap ?? []).map((s: any) => ({
          skill: s.skill ?? '',
          subject: s.subject ?? '',
          level: ['сильная зона', 'средняя зона', 'слабая зона'].includes(s.level) ? s.level : 'средняя зона',
          examImportance: s.examImportance ?? 'Среднее',
        })),
      });
    } catch (err: unknown) {
      lastError = err;
      const is429 = err instanceof Error && (err.message.includes('429') || err.message.includes('Too Many Requests') || err.message.includes('rate_limit') || err.message.includes('overloaded'));
      if (is429 && attempt < 2) {
        const delay = extractRetryDelay(err);
        console.warn(`Claude 429, повтор через ${delay / 1000}с (попытка ${attempt + 1}/3)`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
