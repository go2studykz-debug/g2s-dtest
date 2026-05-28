'use server';

import {
  StudentResult,
  Question,
  Test,
  Subject,
} from './types';
import { analyzeStudentResult } from '@/ai/flows/admin-ai-result-analysis';
import Anthropic from '@anthropic-ai/sdk';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Firestore,
  query,
  where
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'g2s_admin';

export async function loginAdmin(password: string): Promise<{ success: boolean }> {
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { success: false };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, process.env.ADMIN_SESSION_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

function getDb(): Firestore {
  const { firestore } = initializeFirebase();
  return firestore;
}

function serializeData<T>(data: T): T {
  if (!data) return data;
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
      return new Date(value.seconds * 1000).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

let _sampleDataEnsured = false;
let _lastAttempt = 0;
const RETRY_COOLDOWN_MS = 60_000; // повторять не чаще раза в минуту

export async function ensureSampleData() {
  if (_sampleDataEnsured) return;
  const now = Date.now();
  if (now - _lastAttempt < RETRY_COOLDOWN_MS) return;
  _lastAttempt = now;
  const db = getDb();
  try {
    // ── Grade 4 Russian track ─────────────────────────────────────────────────
    const test4Id = 'test-4-ru';
    await setDoc(doc(db, 'tests', test4Id), {
      name: 'Диагностический тест НИШ (4 класс, рус. трек)',
      class_number: 4, language: 'ru', is_active: true, total_time_minutes: 70,
      blocks: [
        { subject: 'math',    question_count: 20, time_limit_minutes: 40 },
        { subject: 'logic',   question_count: 5,  time_limit_minutes: 10 },
        { subject: 'english', question_count: 10, time_limit_minutes: 15 },
        { subject: 'kazakh',  question_count: 5,  time_limit_minutes: 5  },
      ],
      created_at: serverTimestamp()
    }, { merge: true });

    const q4Snap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test4Id)));
    const needsReload4ru = q4Snap.size < 40 || !q4Snap.docs.some(d => (d.data().question_text as string)?.includes('параллелепипеда'));
    if (needsReload4ru) {
      for (const d of q4Snap.docs) await deleteDoc(d.ref);
      const Q4 = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string) =>
        ({ test_id: test4Id, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans, class_number: 4, language: 'ru' });

      const qs4 = [
        // МАТЕМАТИКА Q1-20
        Q4(1,'math','Найдите объём параллелепипеда, если его длина — 8 см, ширина — 5 см, высота — 3 см.','15 см³','120 см³','80 см³','40 см³','B'),
        Q4(2,'math','У параллелепипеда длина 10 см, ширина 6 см, высота 4 см. Найдите объём.','200 см³','180 см³','240 см³','300 см³','C'),
        Q4(3,'math','Автомобиль проехал 240 км за 4 часа. С какой скоростью он двигался?','40 км/ч','50 км/ч','60 км/ч','70 км/ч','C'),
        Q4(4,'math','Поезд прошёл 360 км за 6 часов. Найдите скорость.','50 км/ч','55 км/ч','60 км/ч','65 км/ч','C'),
        Q4(5,'math','$234 \\times 4 = ?$','$936$','$924$','$856$','$948$','A'),
        Q4(6,'math','$672 \\div 8 = ?$','$92$','$83$','$84$','$96$','C'),
        Q4(7,'math','2 м 35 см = ? см','235 см','250 см','200 см','350 см','A'),
        Q4(8,'math','5 кг 600 г = ? г','506 г','5600 г','6000 г','6500 г','B'),
        Q4(9,'math','$1 \\text{ м}^2 = ? \\text{ см}^2$','$10 \\text{ см}^2$','$100 \\text{ см}^2$','$1000 \\text{ см}^2$','$10\\,000 \\text{ см}^2$','D'),
        Q4(10,'math','$3 \\text{ м}^2 = ? \\text{ дм}^2$','$30 \\text{ дм}^2$','$300 \\text{ дм}^2$','$3000 \\text{ дм}^2$','$30\\,000 \\text{ дм}^2$','B'),
        Q4(11,'math','$123 \\times 7 = ?$','$741$','$851$','$861$','$931$','C'),
        Q4(12,'math','$864 \\div 6 = ?$','$124$','$134$','$144$','$154$','C'),
        Q4(13,'math','$25 \\times 12 = ?$','$200$','$250$','$275$','$300$','D'),
        Q4(14,'math','$360 \\div 12 = ?$','$25$','$30$','$35$','$40$','B'),
        Q4(15,'math','Из двух городов, расстояние между которыми 180 км, одновременно выехали навстречу друг другу два автомобиля. Скорость первого — 60 км/ч, второго — 30 км/ч. Через сколько часов они встретятся?','2 ч','3 ч','4 ч','5 ч','A'),
        Q4(16,'math','Расстояние между двумя посёлками — 210 км. Один автомобиль выехал из пункта А со скоростью 70 км/ч, а другой из пункта B со скоростью 35 км/ч. Через сколько часов они встретятся?','1 ч','2 ч','1,5 ч','3 ч','B'),
        Q4(17,'math','3 часа 15 минут = ? минут','135 мин','175 мин','180 мин','195 мин','D'),
        Q4(18,'math','5 км 250 м = ? м','5250 м','520 м','5025 м','5050 м','A'),
        Q4(19,'math','$480 \\div 6 \\times 5 = ?$','$300$','$350$','$400$','$450$','C'),
        Q4(20,'math','Из города А в город B выехал автобус со скоростью 50 км/ч. Через час из того же города выехал легковой автомобиль со скоростью 70 км/ч. Через сколько часов автомобиль догонит автобус?','2,5 ч','3 ч','2 ч','3,5 ч','A'),
        // ЛОГИКА Q21-25
        Q4(21,'logic','На ферме живут куры и кролики. У них вместе 20 голов и 56 ног. Сколько на ферме кур и сколько кроликов?','6 кур, 14 кроликов','8 кур, 12 кроликов','10 кур, 10 кроликов','12 кур, 8 кроликов','D'),
        Q4(22,'logic','У Айгуль, Мадины и Аяна вместе 24 яблока. У Айгуль яблок столько же, сколько у Мадины и Аяна вместе. У Аяна на 2 яблока меньше, чем у Мадины. Сколько яблок у Айгуль?','12','14','16','18','A'),
        Q4(23,'logic','Трое друзей — Арман, Бек и Данияр — любят читать. Один читает сказки, другой — приключения, третий — детективы. Арман не читает сказки и не читает детективы, а Бек не читает детективы. Кто что читает?','Арман — приключения, Бек — сказки, Данияр — детективы','Арман — детективы, Бек — сказки, Данияр — приключения','Арман — сказки, Бек — приключения, Данияр — детективы','Арман — детективы, Бек — приключения, Данияр — сказки','A'),
        Q4(24,'logic','Асем села в 3-й вагон, считая от головы поезда, а Нуржан — в 3-й вагон, считая от хвоста поезда. Между ними 4 вагона. Сколько всего вагонов в поезде?','8','9','10','11','C'),
        Q4(25,'logic','На улице стоят подряд 5 домов с номерами: 11, 13, 15, 17 и 19. В каком доме живёт Ерлан, если его дом не крайний и сумма цифр его номера равна 8?','13','15','17','19','C'),
        // АНГЛИЙСКИЙ Q26-35
        Q4(26,'english','Max is my dog. He is small and white. He likes to run in the park and play with a ball.\n\nWhat color is Max?','Brown','Black','White','Grey','C'),
        Q4(27,'english','It\'s Saturday. The sun is shining, and the sky is blue. Sam goes outside to ride his bike.\n\nWhat does Sam do on Saturday?','He watches TV','He rides his bike','He does homework','He sleeps','B'),
        Q4(28,'english','Sara helps her mother in the garden. They plant flowers and water them every day. Sara\'s favorite flower is the red rose.\n\nWhat is Sara\'s favorite flower?','Tulip','Lily','Rose','Sunflower','C'),
        Q4(29,'english','It was Leo\'s birthday yesterday. His parents gave him a blue backpack. He took it to school and showed it to his friends.\n\nWhat did Leo get for his birthday?','A toy car','A blue backpack','A football','A T-shirt','B'),
        Q4(30,'english','Mila couldn\'t find her house key after school. She looked in her bag, her pocket, and even under the bench. Finally, she remembered that she left it in the classroom.\n\nWhere did Mila\'s key actually stay?','In her pocket','Under the bench','In the classroom','At home','C'),
        Q4(31,'english','It started to rain, and the football match was canceled. Ben was sad, but his dad suggested watching an old movie together. They made popcorn and laughed all evening.\n\nWhy did Ben feel happy in the end?','The match started again','He watched a movie with his dad','He met his friends','The rain stopped','B'),
        Q4(32,'english','During art class, Emma\'s pencil broke. She didn\'t have another one. Her friend Ali gave her his extra pencil and smiled. Later, Emma helped Ali with his project.\n\nWhat can we learn about Emma and Ali?','They don\'t like art','They often argue','They help each other','They are in different classes','C'),
        Q4(33,'english','The class went to the science museum. There were robots, space models, and a big screen showing the planets. Tim liked the robot most because it could talk and move.\n\nWhy did Tim like the robot?','It could move and talk','It was big and red','It was from space','It was made of paper','A'),
        Q4(34,'english','Last summer, Anna and her family climbed a small mountain. It was hard, but when they reached the top, they saw the beautiful valley below. Anna took pictures and said she wanted to come again next year.\n\nHow did Anna feel after climbing the mountain?','Tired and angry','Bored and sleepy','Happy and proud','Sad and cold','C'),
        Q4(35,'english','One morning, Tom found a letter in his mailbox. It had no name, only a drawing of a star. In the evening, his friend Mia called and said, "Did you find my secret message?" Tom smiled — now he knew who sent it.\n\nWhy did Tom smile at the end?','He found the star','He understood who sent the letter','He drew the picture','He got a new mailbox','B'),
        // КАЗАХСКИЙ ТІЛ Q36-40
        Q4(36,'kazakh','Бір күні Дамир ата-әжесіне көмектесіп, аулада ағаш екті. Атасы: «Ағаш егу – ертеңге қалдырған із, ал телефон – бүгінгі қызық», – деді.\n\nАтаның сөзі нені білдіреді?','Телефон өмірде ең маңызды нәрсе','Еңбек пен жақсылық адамды өсіреді','Ағаш егу пайдалы емес','Балаларға демалу керек','B'),
        Q4(37,'kazakh','Айман үлкен қалада оқиды. Көктемгі демалыста ол ауылдағы әжесіне барды. Ол түсінді – үй деген тек қабырғалар емес, ол – сағыныш пен мейірімнің мекені.\n\nАйман нені ұқты?','Үйдің жылулығы тек пештен келеді','Үй – тек тұрмыс орны емес, рухани жылулық','Әжелер әрқашан нан пісіреді','Қала өмірі қызық емес','B'),
        Q4(38,'kazakh','Жазда Нұрбек пен әкесі Каспий теңізіне барды. Әкесі: «кейбір істер уақытпен ұмытылады, ал жақсы іс қалады», – деді.\n\nӘкесінің айтқан ойы қандай?','Барлық істер мәңгі есте қалады','Тек жақсы істер адамды еске қалдырады','Із қалдыру маңызды емес','Табиғат бәрін өшіріп тастайды','B'),
        Q4(39,'kazakh','Мектепте экология сабағында оқушыларға бір бидай дәні берілді. Мұғалім: «Бұл кішкентай дәнде үлкен өмір бар», – деді.\n\nМұғалімнің «үлкен өмір бар» деген сөзі нені білдіреді?','Әр дән өспей қалады','Кішкентай нәрседе де үлкен мағына бар','Бидай ең пайдалы тағам','Өсімдіктерге күтім қажет емес','B'),
        Q4(40,'kazakh','Бір күні ауылда электр жарығы өшіп қалды. Тек Аружан қолына шам алып, кітап оқи бастады. Аружан: «Мен шаммен жаңа әлем аштым», – деді.\n\nАружанның сөзі нені аңғартады?','Ол жарықты жақсы көреді','Ол кітаптан жаңа білім алғанын айтты','Ол гаджетсіз өмір сүре алмайды','Ол ұйықтап қалды','B'),
      ];
      for (const q of qs4) await setDoc(doc(db, 'questions', `q-${test4Id}-${q.question_number}`), q);
    }

    // ── Grade 4 Kazakh track ──────────────────────────────────────────────────
    const test4kzId = 'test-4-kz';
    await setDoc(doc(db, 'tests', test4kzId), {
      name: 'Диагностический тест НИШ (4 класс, каз. трек)',
      class_number: 4, language: 'kz', is_active: true, total_time_minutes: 70,
      blocks: [
        { subject: 'math',    question_count: 20, time_limit_minutes: 40 },
        { subject: 'logic',   question_count: 5,  time_limit_minutes: 10 },
        { subject: 'english', question_count: 10, time_limit_minutes: 15 },
        { subject: 'russian', question_count: 5,  time_limit_minutes: 5  },
      ],
      created_at: serverTimestamp()
    }, { merge: true });

    const q4kzSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test4kzId)));
    const needsReload4kz = q4kzSnap.size < 40 || !q4kzSnap.docs.some(d => (d.data().question_text as string)?.includes('Параллелепипедтің'));
    if (needsReload4kz) {
      for (const d of q4kzSnap.docs) await deleteDoc(d.ref);
      const Q4kz = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string) =>
        ({ test_id: test4kzId, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans, class_number: 4, language: 'kz' });

      const qs4kz = [
        // МАТЕМАТИКА Q1-20
        Q4kz(1,'math','Параллелепипедтің көлемін тап, егер оның ұзындығы – 8 см, ені – 5 см, биіктігі – 3 см болса.','15 см³','120 см³','80 см³','40 см³','B'),
        Q4kz(2,'math','Параллелепипедтің ұзындығы 10 см, ені 6 см, биіктігі 4 см. Көлемін тап.','200 см³','180 см³','240 см³','300 см³','C'),
        Q4kz(3,'math','Автокөлік 240 км қашықтықты 4 сағатта жүріп өтті. Ол қандай жылдамдықпен қозғалды?','40 км/сағ','50 км/сағ','60 км/сағ','70 км/сағ','C'),
        Q4kz(4,'math','Пойыз 360 км қашықтықты 6 сағатта жүріп өтті. Жылдамдығын тап.','50 км/сағ','55 км/сағ','60 км/сағ','65 км/сағ','C'),
        Q4kz(5,'math','$234 \\times 4 = ?$','$936$','$924$','$856$','$948$','A'),
        Q4kz(6,'math','$672 \\div 8 = ?$','$92$','$83$','$84$','$96$','C'),
        Q4kz(7,'math','2 м 35 см = ? см','235 см','250 см','200 см','350 см','A'),
        Q4kz(8,'math','5 кг 600 г = ? г','506 г','5600 г','6000 г','6500 г','B'),
        Q4kz(9,'math','$1 \\text{ м}^2 = ? \\text{ см}^2$','$10 \\text{ см}^2$','$100 \\text{ см}^2$','$1000 \\text{ см}^2$','$10\\,000 \\text{ см}^2$','D'),
        Q4kz(10,'math','$3 \\text{ м}^2 = ? \\text{ дм}^2$','$30 \\text{ дм}^2$','$300 \\text{ дм}^2$','$3000 \\text{ дм}^2$','$30\\,000 \\text{ дм}^2$','B'),
        Q4kz(11,'math','$123 \\times 7 = ?$','$741$','$851$','$861$','$931$','C'),
        Q4kz(12,'math','$864 \\div 6 = ?$','$124$','$134$','$144$','$154$','C'),
        Q4kz(13,'math','$25 \\times 12 = ?$','$200$','$250$','$275$','$300$','D'),
        Q4kz(14,'math','$360 \\div 12 = ?$','$25$','$30$','$35$','$40$','B'),
        Q4kz(15,'math','Ара қашықтығы 180 км болатын екі қаладан екі автомобиль бір уақытта бір-біріне қарама-қарсы шықты. Біріншісінің жылдамдығы – 60 км/сағ, екіншісінікі – 30 км/сағ. Олар неше сағаттан кейін кездеседі?','2 сағат','3 сағат','4 сағат','5 сағат','A'),
        Q4kz(16,'math','Екі елді мекеннің арақашықтығы — 210 км. Бір автомобиль А пунктінен 70 км/сағ жылдамдықпен, ал екіншісі B пунктінен 35 км/сағ жылдамдықпен шықты. Олар неше сағаттан кейін кездеседі?','1 сағат','2 сағат','1,5 сағат','3 сағат','B'),
        Q4kz(17,'math','3 сағат 15 минут = ? минут','135 мин','175 мин','180 мин','195 мин','D'),
        Q4kz(18,'math','5 км 250 м = ? м','5250 м','520 м','5025 м','5050 м','A'),
        Q4kz(19,'math','$480 \\div 6 \\times 5 = ?$','$300$','$350$','$400$','$450$','C'),
        Q4kz(20,'math','A қаласынан B қаласына автобус 50 км/сағ жылдамдықпен шықты. Бір сағаттан кейін сол қаладан жеңіл автокөлік 70 км/сағ жылдамдықпен жолға шықты. Автокөлік автобусты неше сағаттан кейін қуып жетеді?','2,5 сағат','3 сағат','2 сағат','3,5 сағат','A'),
        // ЛОГИКА Q21-25
        Q4kz(21,'logic','Фермада тауықтар мен қояндар тұрады. Олардың барлығында бірге 20 бас және 56 аяқ бар. Фермада неше тауық пен неше қоян бар?','6 тауық, 14 қоян','8 тауық, 12 қоян','10 тауық, 10 қоян','12 тауық, 8 қоян','D'),
        Q4kz(22,'logic','Айгүл, Мадина және Аянда барлығы 24 алма бар. Айгүлдегі алма саны Мадина мен Аяндағы алмалардың қосындысына тең. Аянда Мадинадан 2 алмаға аз. Айгүлде неше алма бар?','12','14','16','18','A'),
        Q4kz(23,'logic','Үш дос — Арман, Бек және Данияр — кітап оқығанды жақсы көреді. Бірі — ертегі, екіншісі — шытырман оқиға, үшіншісі — детектив оқиды. Арман ертегі де, детектив те оқымайды, ал Бек детектив оқымайды. Кім қандай кітап оқиды?','Арман — шытырман оқиға, Бек — ертегілер, Данияр — детективтер','Арман — детективтер, Бек — ертегілер, Данияр — шытырман оқиға','Арман — ертегілер, Бек — шытырман оқиға, Данияр — детективтер','Арман — детективтер, Бек — шытырман оқиға, Данияр — ертегілер','A'),
        Q4kz(24,'logic','Әсем пойыздың бас жағынан санап 3-вагонға отырды, ал Нұржан — соңынан санап 3-вагонға отырды. Олардың арасында 4 вагон бар. Пойызда барлығы неше вагон?','8','9','10','11','C'),
        Q4kz(25,'logic','Көшеде қатар тұрған 5 үйдің нөмірлері: 11, 13, 15, 17 және 19. Ерлан қай үйде тұрады, егер оның үйі шеткі үй емес және үй нөмірінің цифрларының қосындысы 8-ге тең болса?','13','15','17','19','C'),
        // АНГЛИЙСКИЙ Q26-35
        Q4kz(26,'english','Max is my dog. He is small and white. He likes to run in the park and play with a ball.\n\nWhat color is Max?','Brown','Black','White','Grey','C'),
        Q4kz(27,'english','It\'s Saturday. The sun is shining, and the sky is blue. Sam goes outside to ride his bike.\n\nWhat does Sam do on Saturday?','He watches TV','He rides his bike','He does homework','He sleeps','B'),
        Q4kz(28,'english','Sara helps her mother in the garden. They plant flowers and water them every day. Sara\'s favorite flower is the red rose.\n\nWhat is Sara\'s favorite flower?','Tulip','Lily','Rose','Sunflower','C'),
        Q4kz(29,'english','It was Leo\'s birthday yesterday. His parents gave him a blue backpack. He took it to school and showed it to his friends.\n\nWhat did Leo get for his birthday?','A toy car','A blue backpack','A football','A T-shirt','B'),
        Q4kz(30,'english','Mila couldn\'t find her house key after school. She looked in her bag, her pocket, and even under the bench. Finally, she remembered that she left it in the classroom.\n\nWhere did Mila\'s key actually stay?','In her pocket','Under the bench','In the classroom','At home','C'),
        Q4kz(31,'english','It started to rain, and the football match was canceled. Ben was sad, but his dad suggested watching an old movie together. They made popcorn and laughed all evening.\n\nWhy did Ben feel happy in the end?','The match started again','He watched a movie with his dad','He met his friends','The rain stopped','B'),
        Q4kz(32,'english','During art class, Emma\'s pencil broke. She didn\'t have another one. Her friend Ali gave her his extra pencil and smiled. Later, Emma helped Ali with his project.\n\nWhat can we learn about Emma and Ali?','They don\'t like art','They often argue','They help each other','They are in different classes','C'),
        Q4kz(33,'english','The class went to the science museum. There were robots, space models, and a big screen showing the planets. Tim liked the robot most because it could talk and move.\n\nWhy did Tim like the robot?','It could move and talk','It was big and red','It was from space','It was made of paper','A'),
        Q4kz(34,'english','Last summer, Anna and her family climbed a small mountain. It was hard, but when they reached the top, they saw the beautiful valley below. Anna took pictures and said she wanted to come again next year.\n\nHow did Anna feel after climbing the mountain?','Tired and angry','Bored and sleepy','Happy and proud','Sad and cold','C'),
        Q4kz(35,'english','One morning, Tom found a letter in his mailbox. It had no name, only a drawing of a star. In the evening, his friend Mia called and said, "Did you find my secret message?" Tom smiled — now he knew who sent it.\n\nWhy did Tom smile at the end?','He found the star','He understood who sent the letter','He drew the picture','He got a new mailbox','B'),
        // РУССКИЙ ЯЗЫК Q36-40
        Q4kz(36,'russian','Однажды Алия нашла старую чёрно-белую фотографию. На ней была её бабушка в школьной форме. Алия поняла, что настоящая красота — в чувствах, а не в цвете.\n\nЧто осознала Алия, глядя на фотографию?','Что старые вещи некрасивые','Что цветные фото всегда лучше','Что важнее — внутреннее тепло, а не внешний вид','Что бабушка была строгой','C'),
        Q4kz(37,'russian','Каждое утро Артём просыпается раньше всех. В эти минуты он чувствует спокойствие и думает о дне. Для него утро — это время, когда можно побыть с собой.\n\nПочему Артём любит утро?','Потому что можно играть с друзьями','Потому что утром тихо и можно подумать','Потому что мама готовит завтрак','Потому что не нужно идти в школу','B'),
        Q4kz(38,'russian','У Лизы была старая кисть. Лиза потеряла её, но заметила, что и без той кисти её картины стали ещё лучше. Тогда Лиза поняла, что волшебство не в кисти, а в ней самой.\n\nЧто поняла Лиза?','Что хорошие рисунки зависят от кисти','Что старые вещи бесполезны','Что рисовать больше неинтересно','Что талант важнее инструмента','D'),
        Q4kz(39,'russian','В класс пришёл новый ученик Аян. После урока Лена тихо помогла ему перевести слова учителя. Лена поняла, что иногда помощь не в громких словах, а в умении понять человека.\n\nКакую истину осознала Лена?','Что людям нужно больше говорить друг с другом','Что ошибки нужно исправлять сразу','Что доброта проявляется не словами, а вниманием','Что тихие люди часто бывают грустными','C'),
        Q4kz(40,'russian','Осенью ученики посадили во дворе школы дубок. Прошли годы, дуб стал высоким и сильным. Для них этот дуб — знак того, что всё, посаженное с добром, остаётся в жизни надолго.\n\nЧто символизирует дуб в тексте?','Труд и заботу, которые приносят плоды','Природу, которая не меняется','Воспоминания о лете','Уроки по биологии','A'),
      ];
      for (const q of qs4kz) await setDoc(doc(db, 'questions', `q-${test4kzId}-${q.question_number}`), q);
    }

    // ── Grade 5 Russian track ─────────────────────────────────────────────────
    const test5Id = 'test-5-ru';
    await setDoc(doc(db, 'tests', test5Id), {
      name: 'Диагностический тест НИШ (5 класс, рус. трек)',
      class_number: 5, language: 'ru', is_active: true, total_time_minutes: 70,
      blocks: [
        { subject: 'math',   question_count: 20, time_limit_minutes: 40 },
        { subject: 'kazakh', question_count: 10, time_limit_minutes: 15 },
        { subject: 'english',question_count: 10, time_limit_minutes: 15 },
      ],
      created_at: serverTimestamp()
    }, { merge: true });

    const q5Snap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test5Id)));
    const needsReload5ru = q5Snap.size < 40
      || !q5Snap.docs.some(d => (d.data().question_number as number) === 1 && (d.data().question_text as string)?.includes('49+c+38'))
      || q5Snap.docs.some(d => (d.data().question_number as number) === 9 && (d.data().question_text as string)?.includes('$288'));
    if (needsReload5ru) {
      for (const d of q5Snap.docs) await deleteDoc(d.ref);
      const Q5ru = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string) =>
        ({ test_id: test5Id, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans, class_number: 5, language: 'ru' });

      const qs5ru = [
        // МАТЕМАТИКА Q1-20
        Q5ru(1,'math','Вычислите значение выражения $49+c+38$, если $c=51$.','$137$','$138$','$139$','$14$','B'),
        Q5ru(2,'math','Найдите значение выражения $25b \\times 5$, если $b=12$.','$1250$','$600$','$1500$','$250$','C'),
        Q5ru(3,'math','Вычислите значение выражения $(m+15)+n$, если $m+n=35$.','$45$','$48$','$50$','$52$','C'),
        Q5ru(4,'math','Решите уравнение: $(12m-5m) \\times 4 = 252$. Найдите $m$.','$6$','$7$','$8$','$9$','D'),
        Q5ru(5,'math','Найдите значение $x$, при котором верно равенство: $(x^2-23) \\times 9 = 117$.','$5$','$6$','$7$','$8$','B'),
        Q5ru(6,'math','Найдите значение $x$, при котором верно равенство $(149-x^3) \\times 7 = 168$.','$4$','$5$','$6$','$7$','B'),
        Q5ru(7,'math','В саду посадили 37 кустов ягод. Кустов крыжовника на 3 больше, чем кустов смородины, и в 2 раза меньше, чем кустов малины. Сколько кустов каждого вида посадили в саду?','8 смородины, 11 крыжовника, 18 малины','7 смородины, 10 крыжовника, 20 малины','6 смородины, 9 крыжовника, 22 малины','9 смородины, 12 крыжовника, 16 малины','B'),
        Q5ru(8,'math','Из данных чисел выпишите те, которые делятся на 3:\n123, 325, 342, 404, 561, 672, 731, 873, 881, 948, 1041, 1112','123, 342, 561, 672, 873, 948, 1041','123, 404, 561, 731, 881, 1041','325, 404, 561, 731, 948, 1112','123, 342, 561, 731, 873, 948','A'),
        Q5ru(9,'math','Из данных чисел выпишите те, которые делятся на 9:\n288, 333, 444, 558, 9468, 507, 8645, 576, 802, 891, 7839, 765, 781, 936','288, 333, 444, 576, 802, 781','333, 558, 8645, 891, 936','288, 444, 507, 576, 802, 765','288, 333, 558, 576, 891, 7839, 936','D'),
        Q5ru(10,'math','Выберите сумму, значение которой не делится на 2:','$915 + 328$','$813 + 215$','$542 + 914$','$711 + 333$','A'),
        Q5ru(11,'math','Выберите сумму, значение которой делится на 5:','$542 + 911$','$710 + 312$','$315 + 650$','$813 + 216$','C'),
        Q5ru(12,'math','Найдите НОК (наименьшее общее кратное) чисел $12$ и $18$.','$24$','$36$','$48$','$54$','B'),
        Q5ru(13,'math','Найдите НОД (наибольший общий делитель) чисел $45$ и $60$.','$10$','$12$','$15$','$20$','C'),
        Q5ru(14,'math','Решите уравнение: $\\dfrac{413-x}{12} + 27 = 60$','$x = 15$','$x = 19$','$x = 21$','$x = 17$','D'),
        Q5ru(15,'math','Найдите сумму: $9\\dfrac{7}{8} + 5\\dfrac{2}{7} + 1\\dfrac{1}{8} + 4\\dfrac{5}{7}$','$21$','$19$','$20$','$18$','A'),
        Q5ru(16,'math','Трактор в первый день вспахал $12\\dfrac{7}{10}$ га земли, а во второй день — на $2\\dfrac{1}{5}$ га больше. Сколько гектаров земли вспахал трактор за два дня?','$28\\dfrac{1}{2}$ га','$27\\dfrac{3}{5}$ га','$29$ га','$26\\dfrac{1}{4}$ га','B'),
        Q5ru(17,'math','От Караганды (через Астану, Ерейментау) до Экибастуза — $505\\dfrac{1}{4}$ км. От Астаны до Ерейментау — $140\\dfrac{4}{5}$ км, от Ерейментау до Экибастуза — $167\\dfrac{9}{20}$ км. Сколько километров от Караганды до Астаны?','$196\\dfrac{3}{4}$ км','$197$ км','$197\\dfrac{1}{4}$ км','$198$ км','B'),
        Q5ru(18,'math','Для нумерации страниц книги использовано 1315 цифр. Сколько страниц пронумеровано, если нумерация начинается с третьей страницы (с цифры 3)?','$448$','$450$','$473$','$432$','C'),
        Q5ru(19,'math','Воды в банке столько, сколько в 4 одинаковых бутылках. В бутылке на 9 чашек меньше, чем в банке. Сколько чашек воды в банке?','$10$','$12$','$14$','$16$','B'),
        Q5ru(20,'math','Асем села в 7-й вагон, считая с начала поезда, а Марина — в 7-й вагон, считая с конца поезда. Девочки оказались в одном вагоне. Сколько вагонов в поезде?','$15$','$14$','$16$','$13$','D'),
        // КАЗАХСКИЙ ЯЗЫК Q21-30
        Q5ru(21,'kazakh','Оқылым 1 — «Қара шаңырақ» дәстүрі\n\nАйнұр жаз сайын ауылға барады. Оның әжесі – отбасының қара шаңырағының иесі. Әжесі Айнұрға ата-баба дәстүрін үйретеді. Ол үшін қара шаңырақ – тек үй емес, отбасының бірлігі мен жылулығының белгісі.\n\nМәтінге сәйкес, Айнұр үшін «қара шаңырақ» нені білдіреді?','Ескі үй мен шаңырақтың суреті','Отбасындағы жылулық пен бірліктің нышаны','Тек ауылдағы үйдің атауы','Тарихи ескерткіш','B'),
        Q5ru(22,'kazakh','Оқылым 2 — «Кітапханадағы бір күн»\n\nЕрасыл сабақтан кейін әр бейсенбіде кітапханаға барады. Ол табиғат пен ғарыш туралы кітаптар оқиды. Кітапханашы апай оған «Жас зерттеуші» кітабын ұсынды.\n\nМәтіндегі Ерасылдың іс-әрекеттерінен оның қандай қасиеті байқалады?','Ол көп сөйлегенді ұнатады','Ол жаңа нәрсені үйренуге қызығады','Ол кітап оқуды тек уақыт өткізу деп санайды','Ол тек ойын-сауық кітаптарын таңдайды','B'),
        Q5ru(23,'kazakh','Оқылым 3 — «Таза су – аманат»\n\nАуылда жаңа су құбыры тартылғанына бір жыл болды. Әлия бұл жағдайды көріп, мектептегі «Эко-дос» клубында арнайы жоба ұсынды. Суды үнемдеу жолдарын түсіндіретін плакаттар жасады.\n\nМәтіндегі Әлияның ісі нені көрсетеді?','Ол табиғатты қорғауға жауапкершілікпен қарайды','Ол мектептегі жобаларға қызықпайды','Ол тек бейнеролик түсіргісі келді','Ол суды көп қолдануды қолдайды','A'),
        Q5ru(24,'kazakh','Оқылым 4 — «Қонақ күту дәстүрі»\n\nАйдос ауылдағы атасының үйіне барғанда әрқашан ерекше жылы қарсы алынады. Атасы жиі айтатын: «Қонақ келсе – құт келеді».\n\nАйдос қандай ой түйді?','Қонақты күту – тек үлкендердің ісі','Қонақжайлық – адамның ішкі мәдениеті мен жылулығы','Қонақ келсе, көп тағам пісіру керек','Қонақжайлық тек ауылда сақталған дәстүр','B'),
        Q5ru(25,'kazakh','Оқылым 5 — «Ұмытылған домбыра»\n\nБекзаттың атасы өнерлі адам болған. Бекзат ескі домбыраны тауып алды және интернеттен күй өнері туралы ақпарат іздеп, бейне сабақтар қарай бастады.\n\nБекзаттың әрекеті нені дәлелдейді?','Ол интернет арқылы атақты болғысы келді','Ол күй өнеріне құрметпен қарап, дәстүрді жалғастырды','Ол атасының көңілін көтергісі келді','Ол тек сабақ үшін күй үйренді','B'),
        Q5ru(26,'kazakh','Жас инженерлер ұшатын қоңыраулы сағат ойлап тауыпты. Олар кәдімгі қоңыраулы сағатқа тікұшақтікіндей қанаттар орнатыпты. Қоңырау шырылдағанда, қанаттары айналып, сағатты төбеге көтеріп әкетеді.\n\nМәтіндегі сағаттың басты ерекшелігі неде?','Ол қанаттары арқылы ұша алады','Ол тек үлкен үйлерде орнатылады','Ол дыбыс шығармайды','Ол электр қуатымен жұмыс істейді','A'),
        Q5ru(27,'kazakh','Жас инженерлер ұшатын қоңыраулы сағат ойлап тауыпты. Олар кәдімгі қоңыраулы сағатқа тікұшақтікіндей қанаттар орнатыпты. Қоңырау шырылдағанда, қанаттары айналып, сағатты төбеге көтеріп әкетеді.\n\nЖас инженерлердің мақсаты қандай болды?','Сағаттың дизайнын жақсарту','Адамды уақытында оятуға көмектесу','Тікұшақ моделін сынау','Сағаттың дыбысын күшейту','B'),
        Q5ru(28,'kazakh','Музыка – адамның жан серігі. Әуен тыңдаған кезде адамның көңіл-күйі өзгереді. Музыкалық аспапта ойнаған кезде адамның қабілеттері ашыла түседі.\n\n«Музыка – адамның жан серігі» деген ой нені білдіреді?','Музыка адамның өмірінде маңызды орын алады','Музыка тек көңіл көтеруге арналған','Музыка адамды ұйықтатуға көмектеседі','Музыка тек аспаптар арқылы орындалады','A'),
        Q5ru(29,'kazakh','Музыка – адамның жан серігі. Желдің ызыңы, өзеннің сылдыры, құстардың сайрауы – бәрі де адамның жанын тыныштандырады.\n\nТабиғат дыбыстарының аталу себебі неде?','Олар адамдарға ұнамайды','Олар да музыканың бір түрі ретінде қабылданады','Олар тек орманда кездеседі','Олар тек балаларға арналған','B'),
        Q5ru(30,'kazakh','Асанәлі Әшімов: «Бала Асанәлінің балалық шағы ауыр болды, өйткені ол уақытта соғыс жүріп жатты. Мен де кішкентай кезімнен еңбекке араластым.»\n\nАсанәлінің балалық шағы қандай жағдайда өтті?','Соғыстан кейінгі жылдары','Қалада бейбіт өмірде','Өнер академиясында','Соғыс жүріп жатқан қиын уақытта','D'),
        // АНГЛИЙСКИЙ Q31-40
        Q5ru(31,'english','Tom loves animals. Every Saturday, he visits the city zoo with his father. His favorite animal is the giraffe. One day, a baby giraffe was born, and Tom named it "Sunny."\n\nWhy does Tom visit the zoo every Saturday?','Because he works there','Because he loves animals','Because his school is near the zoo','Because he wants to see his friends','B'),
        Q5ru(32,'english','Emma loves reading books after school. She goes to the library every Wednesday. Emma dreams of becoming an astronaut one day.\n\nWhat does Emma want to be in the future?','A teacher','A doctor','An astronaut','A writer','C'),
        Q5ru(33,'english','Liam and his family live near the mountains. Every Sunday, they go hiking together. Liam loves the fresh air and the sound of birds.\n\nWhat does Liam\'s family do every Sunday?','They go shopping','They go hiking','They visit friends','They watch movies','B'),
        Q5ru(34,'english','Sophia has a small puppy named Max. He is white and very playful. Every morning, Max runs around the garden.\n\nWhat color is Sophia\'s puppy?','Brown','Black','White','Gray','C'),
        Q5ru(35,'english','Jack loves helping his parents in the kitchen. On Saturdays, he helps his mom make pancakes. Jack puts honey on top and eats five pancakes!\n\nWhat does Jack put on his pancakes?','Jam','Chocolate','Butter','Honey','D'),
        Q5ru(36,'english','Olivia has a big garden behind her house. She grows flowers, tomatoes, and carrots. Every morning she waters the plants.\n\nWhat does Olivia grow in her garden?','Fruits and trees','Flowers and vegetables','Only flowers','Only carrots','B'),
        Q5ru(37,'english','Ethan likes playing football with his friends. Ethan is the team captain and always wears a red T-shirt.\n\nWhat color is Ethan\'s T-shirt?','Blue','Green','Red','Yellow','C'),
        Q5ru(38,'english','Mia\'s birthday was last Saturday. Mia\'s parents gave her a new pink bicycle as a gift.\n\nWhat present did Mia get for her birthday?','A doll','A book','A bicycle','A phone','C'),
        Q5ru(39,'english','Lily loves spending time in her grandmother\'s kitchen. Every weekend, they bake cookies together.\n\nWhat does Lily enjoy doing with her grandmother?','Planting flowers','Watching TV','Baking cookies','Drawing pictures','C'),
        Q5ru(40,'english','Noah lives near the sea. One day, he found a small bottle with a message inside — a letter from a boy in another country.\n\nWhat did Noah find on the beach?','A map','A treasure box','A shell collection','A bottle with a message','D'),
      ];
      for (const q of qs5ru) await setDoc(doc(db, 'questions', `q-${test5Id}-${q.question_number}`), q);
    }

    // ── Grade 6 Russian track — real Big Exam content (90 questions) ──────────
    const test6ruId = 'test-6-ru';
    await setDoc(doc(db, 'tests', test6ruId), {
      name: 'Диагностический тест НИШ (6 класс, рус. трек)',
      class_number: 6, language: 'ru', is_active: true, total_time_minutes: 120,
      blocks: [
        { subject: 'math',         question_count: 20, time_limit_minutes: 30 },
        { subject: 'quantitative', question_count: 30, time_limit_minutes: 15 },
        { subject: 'science',      question_count: 10, time_limit_minutes: 15 },
        { subject: 'russian',      question_count: 10, time_limit_minutes: 20 },
        { subject: 'kazakh',       question_count: 10, time_limit_minutes: 20 },
        { subject: 'english',      question_count: 10, time_limit_minutes: 20 },
      ],
      created_at: serverTimestamp()
    }, { merge: true });

    const q6Snap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test6ruId)));
    const needsReload6ru = q6Snap.size < 90 || !q6Snap.docs.some(d => (d.data().question_text as string)?.includes('0,(42)'));
    if (needsReload6ru) {
      for (const d of q6Snap.docs) await deleteDoc(d.ref);

      const Q6 = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string, img?: string) =>
        ({ test_id: test6ruId, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans,
           class_number: 6, language: 'ru', image_url: img !== undefined ? img : null });

      // QT: cond = условие верхней строки (пустая строка = нет условия)
      const QT = (n: number, cond: string, colA: string, colB: string, ans: string, img?: string) =>
        Q6(n, 'quantitative' as Subject,
           cond ? `${cond}|||${colA}|||${colB}` : `${colA}|||${colB}`,
           'Колонка А больше', 'Колонка В больше', 'Значения равны', 'Нельзя определить', ans, img);

      const qs6: ReturnType<typeof Q6>[] = [
        // ── МАТЕМАТИКА Q1-20 ─────────────────────────────────────────────────
        Q6(1,'math','Вычислите: $\\dfrac{3}{8} \\cdot 3\\dfrac{1}{9} - 2\\dfrac{1}{2} : 3\\dfrac{3}{4} + 5\\dfrac{1}{3}$','$3\\dfrac{1}{2}$','$5\\dfrac{5}{6}$','$7\\dfrac{1}{6}$','$7\\dfrac{2}{3}$','B'),
        Q6(2,'math','В классе у 11 учащихся день рождения в первой половине года, а у 14 учащихся во второй половине года. Какую часть класса составляют учащиеся, у которых день рождения во второй половине года?','$\\dfrac{11}{25}$','$\\dfrac{14}{25}$','$\\dfrac{11}{14}$','$\\dfrac{14}{11}$','B'),
        Q6(3,'math','Точки A, B, C, D расположены на координатной прямой последовательно. Координаты: A = 16, B = 20. Найдите координату точки D, если $|AB| = 2|BC|$, $|BC| = 2|CD|$.','$23$','$24$','$28$','$44$','A'),
        Q6(4,'math','Сколько существует двузначных чисел, кратных 11, но не кратных 33?','$4$','$5$','$6$','$7$','C'),
        Q6(5,'math','От ленты длиной 1120 см последовательно отрезали куски длиной 80 см. Сколько было сделано разрезов?','$10$','$12$','$13$','$14$','C'),
        Q6(6,'math','Сухое молоко содержит жир, белок, сахар и воду. Вода — 3%, жир — 25%, сахар — 42%. Сколько граммов белка содержится в 1 килограмме сухого молока?','$0{,}3$ г','$3$ г','$30$ г','$300$ г','D'),
        Q6(7,'math','Найдите отношение $\\dfrac{x}{y}$ из выражения $\\dfrac{7}{12} \\cdot y : \\dfrac{7}{50} = 50x : 4\\dfrac{4}{5}$.','$\\dfrac{1}{6250}$','$\\dfrac{1}{1000}$','$\\dfrac{2}{5}$','$2\\dfrac{1}{12}$','C'),
        Q6(8,'math','Число $a$ на 400% больше числа $b$. На сколько процентов число $b$ меньше числа $a$?','$20\\%$','$75\\%$','$80\\%$','$400\\%$','C'),
        Q6(9,'math','Длина дороги между городами — 2400 км. Масштаб карты — 1:200 000 000. Какой длины получится линия, изображающая этот путь на карте? Ответ дайте в миллиметрах.','$1{,}2$ мм','$12$ мм','$120$ мм','$1200$ мм','B'),
        Q6(10,'math','Найдите сумму корней уравнения $\\dfrac{|x+2|}{-2{,}3} = \\dfrac{-5{,}1}{1{,}7}$.','$-8{,}9$','$-4$','$4$','$4{,}9$','B'),
        Q6(11,'math','Сравните значения выражений: $M = |-7| - 4$, $N = |-7 - 4|$, $K = -7 - |-4|$.','$M < N < K$','$N < M < K$','$K < M < N$','$K < N < M$','C'),
        Q6(12,'math','Если Арлан поедет на скутере со скоростью 36 км/ч, то опоздает на 15 минут. Если же он поедет со скоростью 60 км/ч, то приедет на 15 минут раньше. С какой скоростью ему нужно ехать, чтобы прибыть вовремя?','40 км/ч','42 км/ч','45 км/ч','48 км/ч','C'),
        Q6(13,'math','Диаметр большого круга 1 м, а диаметр малого круга $0{,}4$ м. Найдите площадь закрашенной фигуры (большой круг с 4 малыми кружками внутри). Число $\\pi$ округлите до сотых.','$0{,}2826$ м²','$0{,}6594$ м²','$1{,}1304$ м²','$2{,}6376$ м²','A'),
        Q6(14,'math','Вычислите 0,(42) − 0,(35).','$\\dfrac{7}{99}$','$\\dfrac{7}{90}$','$\\dfrac{7}{100}$','$\\dfrac{7}{10}$','A'),
        Q6(15,'math','Двое рабочих, работая вместе, выполняют некоторую работу за 6 часов. Первый рабочий, работая самостоятельно, может выполнить эту работу за 15 часов. За сколько часов может выполнить эту работу второй рабочий самостоятельно?','$9$ ч','$10$ ч','$10{,}5$ ч','$12{,}5$ ч','B'),
        Q6(16,'math','Учитель дал одному ученику 3 ореха, а всем остальным по 5. Если бы он всем дал по 4 ореха, то у него осталось бы 15 орехов. Если общее число орехов учителя равно $x$, выберите правильное равенство.','$\\dfrac{x-2}{5} = \\dfrac{x+15}{4}$','$\\dfrac{x-3}{4} = \\dfrac{x-15}{5}$','$\\dfrac{x+2}{5} = \\dfrac{x-15}{4}$','$\\dfrac{x+3}{5} = \\dfrac{x-19}{4}$','C'),
        Q6(17,'math','Даны два четырёхзначных числа: 416x и y053. Первое делится на 6 без остатка, второе делится на 9 без остатка. Найдите произведение x и y.','$0$','$4$','$6$','$8$','B'),
        Q6(18,'math','В школе 72 шестиклассника. Математический кружок посещают 36 учеников, физический — 28, химический — 20. Пересечения: мат.∩физ. = 16, мат.∩хим. = 10, физ.∩хим. = 6, все три = 4. Сколько учеников не посещают ни один кружок?','$8$','$16$','$18$','$28$','B'),
        Q6(19,'math','В классе у 11 учащихся день рождения в первой половине года, у 14 — во второй. Найдите, какую часть класса составляют учащиеся со вторым полугодием рождения.','$\\dfrac{11}{25}$','$\\dfrac{14}{25}$','$\\dfrac{11}{14}$','$\\dfrac{14}{11}$','B'),
        Q6(20,'math','Дана числовая последовательность: 1; $\\dfrac{3}{4}$; $\\dfrac{5}{7}$; $\\dfrac{7}{10}$; X; ... Найдите X.','$\\dfrac{3}{5}$','$\\dfrac{9}{13}$','$\\dfrac{3}{4}$','$\\dfrac{11}{13}$','B'),

        // ── КОЛИЧЕСТВЕННЫЕ ХАРАКТЕРИСТИКИ Q21-50 ────────────────────────────
        QT(21,'Окружность A имеет радиус R, окружность B имеет радиус 2R.','Отношение длины окружности A к её диаметру','Отношение длины окружности B к её диаметру','C'),
        QT(22,'$w + x + y = 21$','Среднее чисел $x$ и $y$','$7$','D'),
        QT(23,'Целое число $x$ случайно выбирается из промежутка от 42 до 92 включительно.','Количество нечётных возможных значений числа $x$','Количество чётных возможных значений числа $x$','B'),
        QT(24,'Налог с продаж составляет 15%. Общая стоимость товара, включая налог, составляет 45 000 тенге.','Цена товара без учёта налога','39 000 тенге','A'),
        QT(25,'$3 < |y| < 7$','$y^2 + 5$','$50$','D'),
        QT(26,'Когда автомобиль B преодолел расстояние D, он преодолел на 25% больше расстояния, чем автомобиль A.','Расстояние, пройденное автомобилем A','$0{,}80 \\cdot D$','C'),
        QT(27,'','$0{,}3(2)$','$\\dfrac{29}{90}$','C'),
        QT(28,'Прямоугольник PQRS.','Длина $PR$','Длина $QS$','C'),
        QT(29,'','$5{,}14$','$5{,}1(4)$','B'),
        QT(30,'$|AC| = |BD|$','Длина $AB$','Длина $CD$','C'),
        QT(31,'','$0{,}4 + 0{,}07 + 0{,}002$','$0{,}4 + 0{,}02 + 0{,}007$','A'),
        QT(32,'','$0{,}(9) + 0{,}(1)$','$1$','A'),
        QT(33,'','В зрительном зале театра в ряду 20 сидений. Сколько всего сидений в зале?','В зрительном зале кинотеатра в ряду 15 сидений. Сколько всего сидений в зале?','D'),
        QT(34,'','$x$, если $x - 4 = 7$','$x$, если $\\dfrac{x}{4} = 3$','B'),
        QT(35,'','$1$ ч $15$ мин $+$ $2$ ч $75$ мин','$6$ ч $30$ мин $-$ $1$ ч $40$ мин','B'),
        QT(36,'','$30\\%$','$0{,}3$','C'),
        QT(37,'','$\\dfrac{1+2+3+4+5+6}{6}$','$\\dfrac{2+4+8}{6}$','A'),
        QT(38,'$|AC| = |BD|$ (точки A, B, C, D на прямой)','$|AC| - |AB|$','$|BD| - |CD|$','C'),
        QT(39,'','$\\dfrac{7}{8}$','$\\dfrac{5}{6}$','A'),
        QT(40,'','$10$ см','$1$ дм','C'),
        QT(41,'','Площадь закрашенной части квадрата','Площадь незакрашенной части квадрата','C'),
        QT(42,'','Доля закрашенной части квадрата','$\\dfrac{9}{16}$','B'),
        QT(43,'','$6x$','$3y$','D'),
        QT(44,'','$|-0{,}6|$','$|0{,}5|$','A'),
        QT(45,'','Наибольшее натуральное число от 1 до 7, делящееся на 3','Наибольшее натуральное число от 1 до 7, делящееся на 2','C'),
        QT(46,'Площадь прямоугольника равна 24, периметр равен 20.','Длина L','Ширина W','D'),
        QT(47,'Два равных круга.','Площадь A','Площадь B','C'),
        QT(48,'','Количество дней в феврале','$28$','D'),
        QT(49,'','Наименьшее чётное число, большее 5','Наибольшее чётное число, меньшее 5','A'),
        QT(50,'$x > 8$','$x$','$10$','D'),

        // ── ЕСТЕСТВОЗНАНИЕ Q51-60 ────────────────────────────────────────────
        Q6(51,'science','Как парниковые газы влияют на климат? Они...','повышают температуру Земли','поглощают солнечную энергию','пропускают больше света через атмосферу','увеличивают концентрацию кислорода в воздухе','A'),
        Q6(52,'science','Как можно замедлить глобальное потепление? Переходя на энергию на основе...','нефти','природного газа','солнца','угля','C'),
        Q6(53,'science','Укажите формулу диоксида углерода.','CO','$\\text{CO}_2$','$\\text{O}_2$','$\\text{H}_2\\text{O}$','B'),
        Q6(54,'science','Как кислотные дожди влияют на леса? Кислотные дожди...','вызывают лесные пожары','ограничивают усвоение питательных веществ','увеличивают pH значение почвы','увеличивают плодородие почвы в лесах','B'),
        Q6(55,'science','На рисунке показана клетка. Как называют часть X клетки (указывает на ядро)?','вакуоль','митохондрия','цитоплазма','ядро','D'),
        Q6(56,'science','Клетка, часто встречающаяся в организмах, которые питаются готовыми веществами, как животные, но неподвижны, как растения. О каком царстве идёт речь?','археи','бактерии','вирусы','грибы','D'),
        Q6(57,'science','Молния возникает в газовой оболочке нашей планеты. Нижний её край располагается на высоте около 1 км, верхний достигает 6–7 км. Назовите эту оболочку.','атмосфера','биосфера','гидросфера','литосфера','A'),
        Q6(58,'science','К какому виду энергии относится молния?','механическая','световая','химическая','электрическая','D'),
        Q6(59,'science','Арман увидел молнию и через 8 секунд услышал гром. На каком приблизительно расстоянии от Армана вспыхнула молния? (скорость звука 340–350 м/с)','40–44 м','680–700 м','2720–2800 м','3400–3500 м','C'),
        Q6(60,'science','Анар планирует полететь в Лондон (UTC+0). Самолёт вылетает из Астаны (UTC+6) в 10:00 по местному времени, время перелёта составляет 7 часов. Определите местное время в Лондоне по прибытии самолёта.','04:00','11:00','15:00','16:00','B'),

        // ── РУССКИЙ ЯЗЫК Q61-70 ─────────────────────────────────────────────
        Q6(61,'russian','Текст 1 «Атсүйек беру». «...любой сарбаз обязан был уступить своего коня...» Почему сарбаз так поступал? Потому что...','друзья всегда помогают друг другу','молодые должны почитать старших','таков был воинский приказ','таков был закон чести и благородства','D'),
        Q6(62,'russian','Текст 2. Какая информация НЕ соответствует содержанию текста?','Большинство людей обходилось без календарей','В древности люди почитали жизнь каждого человека','Женщины и дети не обладали особыми льготами','Отец семейства имел право праздновать день рождения','B'),
        Q6(63,'russian','Текст 3 (о дайвинге). Какова роль второго абзаца по отношению к первому? Он является его...','обоснованием','опровержением','противопоставлением','сравнением','A'),
        Q6(64,'russian','Текст 4 (о переедании). В каком значении в тексте использованы слова «внешние раздражители»?','это громкая и ритмичная музыка','это компьютерная игра и телепередача','это окружающие вас люди','это приятный запах, аппетитный вид пищи','B'),
        Q6(65,'russian','Текст 4. Какое предложение лучше всего вставить на место пропуска в последнем абзаце?','нельзя контролировать количество съеденного во время игры или при просмотре ТВ','нельзя совмещать питание с игрой на компьютере или с просмотром телепередач','нужно тщательнее пережёвывать пищу во время игры на компьютере и просмотра ТВ','','C'),
        Q6(66,'russian','Текст 6 «Прекрасный образ дочери степей». Какова идея текста?','Для участия в фотосессии нужны красивые девушки','Национальная одежда — лучшее украшение девушки','Необходимо в городах носить национальную одежду','Необходимо помнить историю национального костюма','D'),
        Q6(67,'russian','Текст 6. Какие слова лучше всего вставить на место пропуска во втором абзаце?','над тем, где','над тем, как','о том, как','о том, что','D'),
        Q6(68,'russian','Текст 7 (о колодцах). Кто очищал колодцы согласно первому абзацу?','дети и внуки выкопавшего','те, кто создавал песни','тот, чьим именем он был назван','честные люди','A'),
        Q6(69,'russian','Текст 7. Как можно было зажечь звезду согласно поверьям?','выкопать колодец','кланяться колодцу и давать ему имя','мыться водой из колодца','угощать людей у колодца','A'),
        Q6(70,'russian','Текст 7. Какова цель текста?','рассказать о традиции давать имена колодцам у казахов','рассказать о лечебных свойствах воды и их применении','рассказать поверья о колодце и обычаи разных народов','','C'),

        // ── КАЗАХСКИЙ ЯЗЫК Q71-80 ────────────────────────────────────────────
        Q6(71,'kazakh','1-мәтін «Асыл шөп». Мәтіннің негізгі ойы қандай?','Ауыр затты қиналмай көтеру үшін қулық жасау керек','Жолға шықпай тұрып, тынығып алу қажет','Қандай жағдай болса да, төзімділік таныту қажет','Нәзіктік пен еңбекқорлық үйлесімді болуы керек','C'),
        Q6(72,'kazakh','2-мәтін (ұшатын сағат). Мәтіндегі сағаттың ерекшелігі неде?','айқайлауында','әндетуінде','жүгіруінде','қалықтауында','D'),
        Q6(73,'kazakh','3-мәтін. Қай ақпарат мәтін мазмұнына сәйкес келеді?\n1. Аға буын ниеті түзу адамдармен араласпаған.\n2. Шын достар әрқашан бір-біріне қолдау болады.','екеуі де бұрыс','екеуі де дұрыс','тек біріншісі','тек екіншісі','D'),
        Q6(74,'kazakh','3-мәтін. «Амал достықтың өрісі қысқа болады». Әйтімбет шешен не айтқысы келді?','Адамдардың шағын тобы ғана бір-бірімен дос бола алады','Қызығушылығы бірдей достардың ортақ әңгімесі таусылады','Өз пайдасын ғана ойлайтындардың достығы шынайы болмайды','Тілеулес адамдардың достық қарым-қатынасы көпке созылмайды','C'),
        Q6(75,'kazakh','4-мәтін (музыка туралы). Қай абзацта музыкаға түсініктеме беріледі?','1','2','3','4','B'),
        Q6(76,'kazakh','4-мәтін. Қай ақпарат мәтін мазмұнына сай?','Жанды әуен адамның денсаулығына әсер ете алады','Музыка адамдардың көңіл көтеруіне ғана арналған','Табиғаттағы сан алуан дыбыс жанға жайлылық береді','Тілшілер музыкалық аспаптарда өте шебер ойнаған','A'),
        Q6(77,'kazakh','4-мәтін. Мәтінге қай тақырып сәйкес келеді?','Ғажайып табиғат','Зерттеу алаңы','Музыка күдіреті','Халық аспаптары','C'),
        Q6(78,'kazakh','5-мәтін «Асанәлі Әшімов». Қай бөлімде балалық шақтың қиындығы туралы айтылады?','1','2','3','4','A'),
        Q6(79,'kazakh','5-мәтін. Қай ақпарат мәтін мазмұнына сәйкес келеді?\n1. Соғыс кезінде балалар жауынгер болып ойнады.\n2. Соғыс кезінде балалар үлкендерге көмектесті.','екеуі де бұрыс','екеуі де дұрыс','тек біріншісі','тек екіншісі','D'),
        Q6(80,'kazakh','5-мәтін. Мәтіндегі оқиғалар реті қандай?\n1. Бала күнгі ойындар\n2. Соғыс және балалық шақ\n3. Оқудың пайдасы\n4. Менің анам','1,2,3,4','1,2,4,3','2,1,4,3','2,4,1,3','D'),

        // ── АНГЛИЙСКИЙ ЯЗЫК Q81-90 ───────────────────────────────────────────
        Q6(81,'english','Crystal Cruises — Luxury Every Day. Which statement about Crystal Cruise ships is correct according to the text?','The cruise lasts for one month','The cruise ships have different entertainment centres','Tourists can\'t go in for sport there','Tourists should pay in the restaurants','B'),
        Q6(82,'english','An overeater is a person who eats too much. What did Mike\'s mother feel about her son\'s meal habit?','She was against her son\'s bad habit','She was glad that he enjoyed this process','She was indifferent about his habit','She was pleased how her son took a meal','A'),
        Q6(83,'english','Hello Caroline letter. Why does Christine write the letter?','Because she enjoys Caroline\'s work','Because she likes listening to her pupils','Because she prefers to teach teenagers','Because she wants to improve her English','A'),
        Q6(84,'english','Job search texts (4 options). Which of the texts below contains information you are looking for about getting a job?','1','2','3','4','D'),
        Q6(85,'english','Modern Bath text. Where can you find this kind of text?','in the advertisement for holidays','in the booklet for tourists','in the invitation card to a concert','in the program of a TV show','B'),
        Q6(86,'english','Eco tips text. What is the main idea of the text? It gives tips on how to...','lead a healthy life','protect the planet','save money','','B'),
        Q6(87,'english','Be a Health Nut! Why is the text about nuts titled \'Be a Health Nut!\'?','Because it informs us about how we can use them in recipes','Because it helps us to buy this valuable product','Because it shows us the usefulness of this food for people','','C'),
        Q6(88,'english','Internet text. Why does the author ask these questions?','He wants readers to publish their answers on the site','He wants to draw our attention to read the text','He wants us to find answers to the questions in the text','','B'),
        Q6(89,'english','What does the word \'It\' refer to in paragraph 2?','a computer','an online system','the Internet','','B'),
        Q6(90,'english','What is the main idea of paragraph 3?','Scientists are still guessing the exact number of computers','The computers connected to the Internet have a rich history','The number of computer users is increasing','','C'),
      ];

      for (const q of qs6) await setDoc(doc(db, 'questions', `q-${test6ruId}-${q.question_number}`), q);
    }

    // ── Grade 6 Kazakh track ─────────────────────────────────────────────────
    const test6kzId = 'test-6-kz';
    await setDoc(doc(db, 'tests', test6kzId), {
      name: 'НЗМ диагностикалық тесті (6-сынып, қаз. тілінде оқитындар)',
      class_number: 6, language: 'kz', is_active: true, total_time_minutes: 120,
      blocks: [
        { subject: 'math',         question_count: 20, time_limit_minutes: 30 },
        { subject: 'quantitative', question_count: 30, time_limit_minutes: 15 },
        { subject: 'science',      question_count: 10, time_limit_minutes: 15 },
        { subject: 'russian',      question_count: 10, time_limit_minutes: 20 },
        { subject: 'kazakh',       question_count: 10, time_limit_minutes: 20 },
        { subject: 'english',      question_count: 10, time_limit_minutes: 20 },
      ],
      created_at: serverTimestamp()
    }, { merge: true });

    const q6kzSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test6kzId)));
    const needsReload6kz = q6kzSnap.size < 90 || !q6kzSnap.docs.some(d => (d.data().question_text as string)?.includes('Парниктік газдар'));
    if (needsReload6kz) {
      for (const d of q6kzSnap.docs) await deleteDoc(d.ref);

      const Q6kz = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string, img?: string) =>
        ({ test_id: test6kzId, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans,
           class_number: 6, language: 'kz', image_url: img !== undefined ? img : null });

      const QTkz = (n: number, cond: string, colA: string, colB: string, ans: string, img?: string) =>
        Q6kz(n, 'quantitative' as Subject,
           cond ? `${cond}|||${colA}|||${colB}` : `${colA}|||${colB}`,
           'А бағаны үлкен', 'В бағаны үлкен', 'Мәндер тең', 'Анықтауға болмайды', ans, img);

      const qs6kz: ReturnType<typeof Q6kz>[] = [
        // ── МАТЕМАТИКА Q1-20 ─────────────────────────────────────────────────
        Q6kz(1,'math','Есептеңіз: $\\dfrac{3}{8} \\cdot 3\\dfrac{1}{9} - 2\\dfrac{1}{2} : 3\\dfrac{3}{4} + 5\\dfrac{1}{3}$','$3\\dfrac{1}{2}$','$5\\dfrac{5}{6}$','$7\\dfrac{1}{6}$','$7\\dfrac{2}{3}$','B'),
        Q6kz(2,'math','Сыныпта 11 оқушының туған күні жылдың бірінші жартысында, ал 14 оқушының екінші жартысында болады. Туған күні жылдың екінші жартысында болатын оқушылар сынып оқушыларының қандай бөлігін құрайды?','$\\dfrac{11}{25}$','$\\dfrac{14}{25}$','$\\dfrac{11}{14}$','$\\dfrac{14}{11}$','B'),
        Q6kz(3,'math','A, B, C, D нүктелері координаталық түзуде ретпен орналасқан. Координаталары: A = 16, B = 20. Егер $|AB| = 2|BC|$, $|BC| = 2|CD|$ болса, D нүктесінің координатасын табыңыз.','$23$','$24$','$28$','$44$','A'),
        Q6kz(4,'math','11-ге бөлінетін, бірақ 33-ке бөлінбейтін екі таңбалы сандар қанша болады?','$4$','$5$','$6$','$7$','C'),
        Q6kz(5,'math','Ұзындығы 1120 см таспадан кезегімен 80 см-лік кесіндіктер кесілді. Неше рет кесілді?','$10$','$12$','$13$','$14$','C'),
        Q6kz(6,'math','Кепкен сүт майды, белокты, қантты және суды қамтиды. Су — 3%, май — 25%, қант — 42%. 1 килограмм кепкен сүтте қанша грамм белок бар?','$0{,}3$ г','$3$ г','$30$ г','$300$ г','D'),
        Q6kz(7,'math','$\\dfrac{7}{12} \\cdot y : \\dfrac{7}{50} = 50x : 4\\dfrac{4}{5}$ өрнегінен $\\dfrac{x}{y}$ қатынасын табыңыз.','$\\dfrac{1}{6250}$','$\\dfrac{1}{1000}$','$\\dfrac{2}{5}$','$2\\dfrac{1}{12}$','C'),
        Q6kz(8,'math','$a$ саны $b$ санынан 400% артық. $b$ саны $a$ санынан қанша процентке аз?','$20\\%$','$75\\%$','$80\\%$','$400\\%$','C'),
        Q6kz(9,'math','Қалалар арасындағы жолдың ұзындығы — 2400 км. Карта масштабы — 1:200 000 000. Картада бұл жолды бейнелейтін сызықтың ұзындығы қандай? Жауапты миллиметрмен беріңіз.','$1{,}2$ мм','$12$ мм','$120$ мм','$1200$ мм','B'),
        Q6kz(10,'math','$\\dfrac{|x+2|}{-2{,}3} = \\dfrac{-5{,}1}{1{,}7}$ теңдеуінің түбірлер қосындысын табыңыз.','$-8{,}9$','$-4$','$4$','$4{,}9$','B'),
        Q6kz(11,'math','Өрнектердің мәндерін салыстырыңыз: $M = |-7| - 4$, $N = |-7 - 4|$, $K = -7 - |-4|$.','$M < N < K$','$N < M < K$','$K < M < N$','$K < N < M$','C'),
        Q6kz(12,'math','Арлан скутерде 36 км/сағ жылдамдықпен жүрсе, 15 минутқа кешігеді. Ал 60 км/сағ жылдамдықпен жүрсе, 15 минут ертерек жетеді. Уақтылы жету үшін қандай жылдамдықпен жүру керек?','40 км/сағ','42 км/сағ','45 км/сағ','48 км/сағ','C'),
        Q6kz(13,'math','Үлкен шеңбердің диаметрі 1 м, кіші шеңбердің диаметрі $0{,}4$ м. Бояланған фигураның ауданын табыңыз (ішінде 4 кіші шеңбері бар үлкен шеңбер). $\\pi$ санын жүзден дәлдікпен дөңгелектеңіз.','$0{,}2826$ м²','$0{,}6594$ м²','$1{,}1304$ м²','$2{,}6376$ м²','A'),
        Q6kz(14,'math','0,(42) − 0,(35) мәнін есептеңіз.','$\\dfrac{7}{99}$','$\\dfrac{7}{90}$','$\\dfrac{7}{100}$','$\\dfrac{7}{10}$','A'),
        Q6kz(15,'math','Екі жұмысшы бірлесіп белгілі бір жұмысты 6 сағатта орындайды. Бірінші жұмысшы жеке жұмыс істегенде бұл жұмысты 15 сағатта орындай алады. Екінші жұмысшы бұл жұмысты жеке орындауға қанша сағат кетеді?','$9$ сағ','$10$ сағ','$10{,}5$ сағ','$12{,}5$ сағ','B'),
        Q6kz(16,'math','Мұғалім бір оқушыға 3 жаңғақ берді, ал қалғандарына 5-тен. Егер ол барлығына 4-тен берсе, 15 жаңғақ артып қалар еді. Мұғалімнің жаңғақтарының жалпы саны $x$ болса, дұрыс теңдеуді таңдаңыз.','$\\dfrac{x-2}{5} = \\dfrac{x+15}{4}$','$\\dfrac{x-3}{4} = \\dfrac{x-15}{5}$','$\\dfrac{x+2}{5} = \\dfrac{x-15}{4}$','$\\dfrac{x+3}{5} = \\dfrac{x-19}{4}$','C'),
        Q6kz(17,'math','Екі төрт таңбалы сан берілген: 416x және y053. Бірінші 6-ға қалдықсыз бөлінеді, екіншісі 9-ға бөлінеді. x мен y-тің көбейтіндісін табыңыз.','$0$','$4$','$6$','$8$','B'),
        Q6kz(18,'math','Мектепте 72 алтыншы сынып оқушысы бар. Математика үйірмесіне 36 оқушы, физика — 28, химия — 20 қатысады. Қиылыстар: мат.∩физ. = 16, мат.∩хим. = 10, физ.∩хим. = 6, үшеуінде де = 4. Ешбір үйірмеге қатыспайтын оқушылар қанша?','$8$','$16$','$18$','$28$','B'),
        Q6kz(19,'math','Сыныпта 11 оқушының туған күні жылдың бірінші жартысында, 14-і екінші жартысында болады. Туған күні жылдың екінші жартысында болатын оқушылардың бөлігін табыңыз.','$\\dfrac{11}{25}$','$\\dfrac{14}{25}$','$\\dfrac{11}{14}$','$\\dfrac{14}{11}$','B'),
        Q6kz(20,'math','Сандық тізбек берілген: 1; $\\dfrac{3}{4}$; $\\dfrac{5}{7}$; $\\dfrac{7}{10}$; X; ... X мәнін табыңыз.','$\\dfrac{3}{5}$','$\\dfrac{9}{13}$','$\\dfrac{3}{4}$','$\\dfrac{11}{13}$','B'),

        // ── САНДЫҚ СИПАТТАМАЛАР Q21-50 ───────────────────────────────────────
        QTkz(21,'A шеңберінің радиусы R, B шеңберінің радиусы 2R.','A шеңберінің ұзындығының диаметріне қатынасы','B шеңберінің ұзындығының диаметріне қатынасы','C'),
        QTkz(22,'$w + x + y = 21$','$x$ және $y$ сандарының орташа мәні','$7$','D'),
        QTkz(23,'Тұтас $x$ саны 42-ден 92-ге дейін (қоса) кездейсоқ таңдалады.','$x$ санының мүмкін тақ мәндерінің саны','$x$ санының мүмкін жұп мәндерінің саны','B'),
        QTkz(24,'Сату салығы 15% құрайды. Салықты қосқандағы тауардың жалпы құны 45 000 теңге.','Салықсыз тауардың бағасы','39 000 теңге','A'),
        QTkz(25,'$3 < |y| < 7$','$y^2 + 5$','$50$','D'),
        QTkz(26,'B автомобилі D қашықтықты жүргенде, A автомобиліне қарағанда 25% артық қашықтық жүрді.','A автомобилі жүрген қашықтық','$0{,}80 \\cdot D$','C'),
        QTkz(27,'','$0{,}3(2)$','$\\dfrac{29}{90}$','C'),
        QTkz(28,'PQRS тіктөртбұрышы.','$PR$ ұзындығы','$QS$ ұзындығы','C'),
        QTkz(29,'','$5{,}14$','$5{,}1(4)$','B'),
        QTkz(30,'$|AC| = |BD|$','$AB$ ұзындығы','$CD$ ұзындығы','C'),
        QTkz(31,'','$0{,}4 + 0{,}07 + 0{,}002$','$0{,}4 + 0{,}02 + 0{,}007$','A'),
        QTkz(32,'','$0{,}(9) + 0{,}(1)$','$1$','A'),
        QTkz(33,'','Театр залында қатарда 20 орын бар. Залда барлығы қанша орын?','Кинотеатр залында қатарда 15 орын бар. Залда барлығы қанша орын?','D'),
        QTkz(34,'','$x$, егер $x - 4 = 7$ болса','$x$, егер $\\dfrac{x}{4} = 3$ болса','B'),
        QTkz(35,'','$1$ сағ $15$ мин $+$ $2$ сағ $75$ мин','$6$ сағ $30$ мин $-$ $1$ сағ $40$ мин','B'),
        QTkz(36,'','$30\\%$','$0{,}3$','C'),
        QTkz(37,'','$\\dfrac{1+2+3+4+5+6}{6}$','$\\dfrac{2+4+8}{6}$','A'),
        QTkz(38,'$|AC| = |BD|$ (A, B, C, D нүктелері түзуде)','$|AC| - |AB|$','$|BD| - |CD|$','C'),
        QTkz(39,'','$\\dfrac{7}{8}$','$\\dfrac{5}{6}$','A'),
        QTkz(40,'','$10$ см','$1$ дм','C'),
        QTkz(41,'','Квадраттың боялған бөлігінің ауданы','Квадраттың боялмаған бөлігінің ауданы','C'),
        QTkz(42,'','Квадраттың боялған бөлігінің үлесі','$\\dfrac{9}{16}$','B'),
        QTkz(43,'','$6x$','$3y$','D'),
        QTkz(44,'','$|-0{,}6|$','$|0{,}5|$','A'),
        QTkz(45,'','1-ден 7-ге дейінгі 3-ке бөлінетін ең үлкен натурал сан','1-ден 7-ге дейінгі 2-ге бөлінетін ең үлкен натурал сан','C'),
        QTkz(46,'Тіктөртбұрыштың ауданы 24, периметрі 20-ға тең.','L ұзындығы','W ені','D'),
        QTkz(47,'Екі тең шеңбер.','A ауданы','B ауданы','C'),
        QTkz(48,'','Ақпандағы күндер саны','$28$','D'),
        QTkz(49,'','5-тен үлкен ең кіші жұп сан','5-тен кіші ең үлкен жұп сан','A'),
        QTkz(50,'$x > 8$','$x$','$10$','D'),

        // ── ЖАРАТЫЛЫСТАНУ Q51-60 ─────────────────────────────────────────────
        Q6kz(51,'science','Парниктік газдар климатқа қалай әсер етеді? Олар...','Жер температурасын жоғарылатады','Күн энергиясын сіңіреді','Атмосфера арқылы көбірек жарық өткізеді','Ауадағы оттегі концентрациясын арттырады','A'),
        Q6kz(52,'science','Жаһандық жылынуды қалай баяулатуға болады? ... негізіндегі энергияға ауысу арқылы.','мұнай','табиғи газ','күн','көмір','C'),
        Q6kz(53,'science','Көмірқышқыл газының формуласын атаңыз.','CO','$\\text{CO}_2$','$\\text{O}_2$','$\\text{H}_2\\text{O}$','B'),
        Q6kz(54,'science','Қышқылды жаңбырлар ормандарға қалай әсер етеді? Қышқылды жаңбырлар...','орман өрттерін тудырады','қоректік заттардың сіңірілуін шектейді','топырақтың рН мәнін жоғарылатады','ормандардағы топырақ құнарлылығын арттырады','B'),
        Q6kz(55,'science','Суретте клетка көрсетілген. X бөлігі (ядроны көрсетеді) қалай аталады?','вакуоль','митохондрия','цитоплазма','ядро','D'),
        Q6kz(56,'science','Жануарлар сияқты дайын заттармен қоректенетін, бірақ өсімдіктер сияқты қозғалмайтын организмдерде жиі кездесетін клетка. Бұл қандай патшалық?','архейлер','бактериялар','вирустар','саңырауқұлақтар','D'),
        Q6kz(57,'science','Жасын планетамыздың газ қабатында пайда болады. Оның төменгі шекарасы шамамен 1 км биіктікте, жоғарғы шекарасы 6–7 км-ге жетеді. Бұл қабат қалай аталады?','атмосфера','биосфера','гидросфера','литосфера','A'),
        Q6kz(58,'science','Жасын қандай энергия түріне жатады?','механикалық','жарық','химиялық','электр','D'),
        Q6kz(59,'science','Арман жасынды көрді және 8 секундтан кейін найзағай дыбысын естіді. Жасын Арманнан шамамен қандай қашықтықта жарқылдады? (дыбыс жылдамдығы 340–350 м/с)','40–44 м','680–700 м','2720–2800 м','3400–3500 м','C'),
        Q6kz(60,'science','Анар Лондонға (UTC+0) ұшып бармақшы. Ұшақ Астанадан (UTC+6) жергілікті уақыт бойынша 10:00-де ұшып шығады, ұшу уақыты 7 сағат. Ұшақ жеткенде Лондондағы жергілікті уақытты анықтаңыз.','04:00','11:00','15:00','16:00','B'),

        // ── ОРЫС ТІЛІ Q61-70 ─────────────────────────────────────────────────
        Q6kz(61,'russian','1-мәтін «Атсүйек беру». «...кез келген сарбаз атын беруге міндетті еді...» Сарбаз неліктен солай жасады? Өйткені...','достар әрқашан бір-біріне көмектеседі','жастар үлкендерді сыйлауы керек','бұл жауынгерлік бұйрық болды','бұл ар-намыс заңы болды','D'),
        Q6kz(62,'russian','2-мәтін. Мәтін мазмұнына сәйкес келмейтін ақпаратты көрсетіңіз.','Адамдардың көпшілігі күнтізбесіз жүрді','Ертеде адамдар әр адамның өмірін бағалады','Әйелдер мен балалардың ерекше артықшылықтары болмады','Отбасы басшысы туған күнін тойлауға құқылы болды','B'),
        Q6kz(63,'russian','3-мәтін (дайвинг туралы). Екінші абзацтың бірінші абзацқа қатынасы қандай? Ол оның...','дәлелі болып табылады','теріске шығаруы болып табылады','қарама-қарсысы болып табылады','салыстыруы болып табылады','A'),
        Q6kz(64,'russian','4-мәтін (шамадан тыс тамақтану туралы). Мәтінде «сыртқы тітіркендіргіштер» сөздері қандай мағынада қолданылды?','бұл қатты және ырғақты музыка','бұл компьютерлік ойын және телехабар','бұл сізді қоршаған адамдар','бұл тамақтың жағымды иісі, тәбетті сыртқы түрі','B'),
        Q6kz(65,'russian','4-мәтін. Соңғы абзацтағы бос орынға қандай сөйлем қою дұрыс?','ойын кезінде немесе теледидар қарау кезінде жеп отырып, тамақ мөлшерін бақылауға болмайды','тамақтануды компьютерлік ойынмен немесе телехабар қарумен біріктіруге болмайды','компьютерде ойнау немесе теледидар қарау кезінде тамақты мұқият шайнау керек','','C'),
        Q6kz(66,'russian','6-мәтін «Дала қызының сұлу бейнесі». Мәтіннің идеясы қандай?','Фотосессияға қатысу үшін сұлу қыздар керек','Ұлттық киім — қыздың ең жақсы безенісі','Қалаларда ұлттық киім кию қажет','Ұлттық костюмнің тарихын есте сақтау қажет','D'),
        Q6kz(67,'russian','6-мәтін. Екінші абзацтағы бос орынға қандай сөздер қою дұрыс?','қайда екендігін','қалай екендігін','қалай болғанын','не болғанын','D'),
        Q6kz(68,'russian','7-мәтін (бұлақтар туралы). Бірінші абзацқа сай бұлақтарды кімдер тазалаған?','оны қазғанның балалары мен немерелері','ән шығарғандар','оның атымен аталғандар','адал адамдар','A'),
        Q6kz(69,'russian','7-мәтін. Сенімдерге сәйкес жұлдызды қалай жандыруға болады?','бұлақ қазу','бұлаққа бас ию және оған ат беру','бұлақ суымен жуыну','бұлақ жанында адамдарды сыйлау','A'),
        Q6kz(70,'russian','7-мәтін. Мәтіннің мақсаты қандай?','қазақтарда бұлаққа ат беру дәстүрі туралы айту','судың емдік қасиеттері мен олардың қолданылуы туралы айту','бұлаққа байланысты нанымдар мен түрлі халықтардың дәстүрлері туралы айту','','C'),

        // ── ҚАЗАҚ ТІЛІ Q71-80 ────────────────────────────────────────────────
        Q6kz(71,'kazakh','1-мәтін «Асыл шөп». Мәтіннің негізгі ойы қандай?','Ауыр затты қиналмай көтеру үшін қулық жасау керек','Жолға шықпай тұрып, тынығып алу қажет','Қандай жағдай болса да, төзімділік таныту қажет','Нәзіктік пен еңбекқорлық үйлесімді болуы керек','C'),
        Q6kz(72,'kazakh','2-мәтін (ұшатын сағат). Мәтіндегі сағаттың ерекшелігі неде?','айқайлауында','әндетуінде','жүгіруінде','қалықтауында','D'),
        Q6kz(73,'kazakh','3-мәтін. Қай ақпарат мәтін мазмұнына сәйкес келеді?\n1. Аға буын ниеті түзу адамдармен араласпаған.\n2. Шын достар әрқашан бір-біріне қолдау болады.','екеуі де бұрыс','екеуі де дұрыс','тек біріншісі','тек екіншісі','D'),
        Q6kz(74,'kazakh','3-мәтін. «Амал достықтың өрісі қысқа болады». Әйтімбет шешен не айтқысы келді?','Адамдардың шағын тобы ғана бір-бірімен дос бола алады','Қызығушылығы бірдей достардың ортақ әңгімесі таусылады','Өз пайдасын ғана ойлайтындардың достығы шынайы болмайды','Тілеулес адамдардың достық қарым-қатынасы көпке созылмайды','C'),
        Q6kz(75,'kazakh','4-мәтін (музыка туралы). Қай абзацта музыкаға түсініктеме беріледі?','1','2','3','4','B'),
        Q6kz(76,'kazakh','4-мәтін. Қай ақпарат мәтін мазмұнына сай?','Жанды әуен адамның денсаулығына әсер ете алады','Музыка адамдардың көңіл көтеруіне ғана арналған','Табиғаттағы сан алуан дыбыс жанға жайлылық береді','Тілшілер музыкалық аспаптарда өте шебер ойнаған','A'),
        Q6kz(77,'kazakh','4-мәтін. Мәтінге қай тақырып сәйкес келеді?','Ғажайып табиғат','Зерттеу алаңы','Музыка күдіреті','Халық аспаптары','C'),
        Q6kz(78,'kazakh','5-мәтін «Асанәлі Әшімов». Қай бөлімде балалық шақтың қиындығы туралы айтылады?','1','2','3','4','A'),
        Q6kz(79,'kazakh','5-мәтін. Қай ақпарат мәтін мазмұнына сәйкес келеді?\n1. Соғыс кезінде балалар жауынгер болып ойнады.\n2. Соғыс кезінде балалар үлкендерге көмектесті.','екеуі де бұрыс','екеуі де дұрыс','тек біріншісі','тек екіншісі','D'),
        Q6kz(80,'kazakh','5-мәтін. Мәтіндегі оқиғалар реті қандай?\n1. Бала күнгі ойындар\n2. Соғыс және балалық шақ\n3. Оқудың пайдасы\n4. Менің анам','1,2,3,4','1,2,4,3','2,1,4,3','2,4,1,3','D'),

        // ── АҒЫЛШЫН ТІЛІ Q81-90 ──────────────────────────────────────────────
        Q6kz(81,'english','Crystal Cruises — Luxury Every Day. Which statement about Crystal Cruise ships is correct according to the text?','The cruise lasts for one month','The cruise ships have different entertainment centres','Tourists can\'t go in for sport there','Tourists should pay in the restaurants','B'),
        Q6kz(82,'english','An overeater is a person who eats too much. What did Mike\'s mother feel about her son\'s meal habit?','She was against her son\'s bad habit','She was glad that he enjoyed this process','She was indifferent about his habit','She was pleased how her son took a meal','A'),
        Q6kz(83,'english','Hello Caroline letter. Why does Christine write the letter?','Because she enjoys Caroline\'s work','Because she likes listening to her pupils','Because she prefers to teach teenagers','Because she wants to improve her English','A'),
        Q6kz(84,'english','Job search texts (4 options). Which of the texts below contains information you are looking for about getting a job?','1','2','3','4','D'),
        Q6kz(85,'english','Modern Bath text. Where can you find this kind of text?','in the advertisement for holidays','in the booklet for tourists','in the invitation card to a concert','in the program of a TV show','B'),
        Q6kz(86,'english','Eco tips text. What is the main idea of the text? It gives tips on how to...','lead a healthy life','protect the planet','save money','','B'),
        Q6kz(87,'english','Be a Health Nut! Why is the text about nuts titled \'Be a Health Nut!\'?','Because it informs us about how we can use them in recipes','Because it helps us to buy this valuable product','Because it shows us the usefulness of this food for people','','C'),
        Q6kz(88,'english','Internet text. Why does the author ask these questions?','He wants readers to publish their answers on the site','He wants to draw our attention to read the text','He wants us to find answers to the questions in the text','','B'),
        Q6kz(89,'english','What does the word \'It\' refer to in paragraph 2?','a computer','an online system','the Internet','','B'),
        Q6kz(90,'english','What is the main idea of paragraph 3?','Scientists are still guessing the exact number of computers','The computers connected to the Internet have a rich history','The number of computer users is increasing','','C'),
      ];

      for (const q of qs6kz) await setDoc(doc(db, 'questions', `q-${test6kzId}-${q.question_number}`), q);

    }

    // Disable old test-1 so it doesn't conflict
    const test1Doc = await getDoc(doc(db, 'tests', 'test-1'));
    if (test1Doc.exists() && test1Doc.data()?.is_active) {
      await setDoc(doc(db, 'tests', 'test-1'), { ...test1Doc.data(), is_active: false }, { merge: true });
    }

    // ── Grade 5 Kazakh track ─────────────────────────────────────────────────
    // Remove legacy test-5-kk document if it exists
    const legacyKkDoc = await getDoc(doc(db, 'tests', 'test-5-kk'));
    if (legacyKkDoc.exists()) {
      const legacyQSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', 'test-5-kk')));
      for (const d of legacyQSnap.docs) await deleteDoc(d.ref);
      await deleteDoc(doc(db, 'tests', 'test-5-kk'));
    }

    const test5kzId = 'test-5-kz';
    const test5kzDoc = await getDoc(doc(db, 'tests', test5kzId));
    if (!test5kzDoc.exists()) {
      await setDoc(doc(db, 'tests', test5kzId), {
        name: 'Диагностический тест НИШ (5 класс, каз. трек)',
        class_number: 5, language: 'kz', is_active: true, total_time_minutes: 70,
        blocks: [
          { subject: 'math',    question_count: 20, time_limit_minutes: 40 },
          { subject: 'russian', question_count: 10, time_limit_minutes: 15 },
          { subject: 'english', question_count: 10, time_limit_minutes: 15 },
        ],
        created_at: serverTimestamp()
      });
    }

    const q5kzSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', test5kzId)));
    if (q5kzSnap.size < 40
      || !q5kzSnap.docs.some(d => (d.data().question_number as number) === 1 && (d.data().question_text as string)?.includes('49 + c + 38'))
      || q5kzSnap.docs.some(d => (d.data().question_number as number) === 9 && (d.data().question_text as string)?.includes('$288'))) {
      for (const d of q5kzSnap.docs) await deleteDoc(d.ref);
      const Q5kz = (n: number, s: Subject, t: string, a: string, b: string, c: string, d2: string, ans: string) =>
        ({ test_id: test5kzId, question_number: n, subject: s, question_text: t,
           option_a: a, option_b: b, option_c: c, option_d: d2, option_e: '', correct_answer: ans, class_number: 5, language: 'kz' });

      const qs5kz = [
        // МАТЕМАТИКА Q1-20
        Q5kz(1,'math','$(c = 51)$ болса, $(49 + c + 38)$ өрнегінің мәнін есепте.','$137$','$138$','$139$','$14$','B'),
        Q5kz(2,'math','$(b = 12)$ болса, $(25b \\times 5)$ өрнегінің мәнін есепте.','$1250$','$600$','$1500$','$250$','C'),
        Q5kz(3,'math','$(m + n = 35)$ болса, $((m + 15) + n)$ өрнегінің мәнін есепте.','$45$','$48$','$50$','$52$','C'),
        Q5kz(4,'math','$(12m - 5m) \\times 4 = 252$ теңдеуін шешіп, $m$ мәнін тап.','$6$','$7$','$8$','$9$','D'),
        Q5kz(5,'math','$(x^2 - 23) \\times 9 = 117$ теңдігі орындалатын $x$ мәнін тап.','$5$','$6$','$7$','$8$','B'),
        Q5kz(6,'math','$(149 - x^3) \\times 7 = 168$ теңдігі орындалатын $x$ мәнін тап.','$4$','$5$','$6$','$7$','B'),
        Q5kz(7,'math','Баққа 37 жидек бұтағы отырғызылды. Қарлыған бұтағы қарақат бұтағынан 3-ке көп, ал таңқурай бұтағынан 2 есе аз. Баққа әр түрден неше бұта отырғызылды?','8 қарақат, 11 қарлыған, 18 таңқурай','7 қарақат, 10 қарлыған, 20 таңқурай','6 қарақат, 9 қарлыған, 22 таңқурай','9 қарақат, 12 қарлыған, 16 таңқурай','B'),
        Q5kz(8,'math','3-ке бөлінетін сандарды тап:\n123, 325, 342, 404, 561, 672, 731, 873, 881, 948, 1041, 1112','123, 342, 561, 672, 873, 948, 1041','123, 404, 561, 731, 881, 1041','325, 404, 561, 731, 948, 1112','123, 342, 561, 731, 873, 948','A'),
        Q5kz(9,'math','9-ға бөлінетін сандарды тап:\n288, 333, 444, 558, 9468, 507, 8645, 576, 802, 891, 7839, 765, 781, 936','288, 333, 444, 576, 802, 781','333, 558, 8645, 891, 936','288, 444, 507, 576, 802, 765','288, 333, 558, 576, 891, 7839, 936','D'),
        Q5kz(10,'math','2-ге бөлінбейтін қосындыны таңда:','$915 + 328$','$813 + 215$','$542 + 914$','$711 + 333$','A'),
        Q5kz(11,'math','5-ке бөлінетін қосындыны таңда:','$542 + 911$','$710 + 312$','$315 + 650$','$813 + 216$','C'),
        Q5kz(12,'math','$12$ мен $18$ сандарының ең кіші ортақ еселігін (ЕКОЕ) тап.','$24$','$36$','$48$','$54$','B'),
        Q5kz(13,'math','$45$ пен $60$ сандарының ең үлкен ортақ бөлгішін (ЕҮОБ) тап.','$10$','$12$','$15$','$20$','C'),
        Q5kz(14,'math','Теңдеуді шешіңіз: $\\dfrac{413 - x}{12} + 27 = 60$','$x = 15$','$x = 19$','$x = 21$','$x = 17$','D'),
        Q5kz(15,'math','$9\\dfrac{7}{8} + 5\\dfrac{2}{7} + 1\\dfrac{1}{8} + 4\\dfrac{5}{7}$ Қосындыны тап.','$21$','$19$','$20$','$18$','A'),
        Q5kz(16,'math','Трактор бірінші күні $12\\dfrac{7}{10}$ га жер жыртты, ал екінші күні — одан $2\\dfrac{1}{5}$ га көп. Трактор екі күнде қанша гектар жер жыртты?','$28\\dfrac{1}{2}$ га','$27\\dfrac{3}{5}$ га','$29$ га','$26\\dfrac{1}{4}$ га','B'),
        Q5kz(17,'math','Қарағандыдан (Астана, Ерейментау арқылы) Екібастұзға дейінгі темір жол қашықтығы — $505\\dfrac{1}{4}$ км. Астанадан Ерейментауға дейін — $140\\dfrac{4}{5}$ км, Ерейментаудан Екібастұзға дейін — $167\\dfrac{9}{20}$ км. Қарағандыдан Астанаға дейінгі темір жол ұзындығы қанша километр?','$196\\dfrac{3}{4}$ км','$197$ км','$197\\dfrac{1}{4}$ км','$198$ км','B'),
        Q5kz(18,'math','Кітап беттерін нөмірлеуге 1315 цифр жұмсалды. Егер нөмірлеу үшінші беттен (3 санынан) басталса, неше бет нөмірленген?','$448$','$450$','$473$','$432$','C'),
        Q5kz(19,'math','Банкадағы су көлемі 4 бірдей бөтелкедегі су көлеміне тең. Әр бөтелкеде банкаға қарағанда 9 стақанға аз су бар. Банкада қанша стақан су бар?','$10$','$12$','$14$','$16$','B'),
        Q5kz(20,'math','Әсем пойыздың бас жағынан санағанда 7-вагонға отырды, ал Марина — соңынан санағанда 7-вагонға отырды. Қыздар бір вагонға отырған. Пойызда неше вагон бар?','$15$','$14$','$16$','$13$','D'),
        // РУССКИЙ ЯЗЫК Q21-30
        Q5kz(21,'russian','Если во время трапезы вы отвлекаетесь на постороннюю деятельность, то съедаете больше пищи, что ведёт к перееданию. Учёные из Бристольского университета исследовали две группы испытуемых: представители первой ели не отвлекаясь, участники второй питались, играя на компьютере или просматривая телепередачи. Организм второй группы «забывал» тщательно пережёвывать пищу и оценивать уровень насыщения, поэтому они съедали вдвое больше.\n\nПочему участники второй группы переедали?','потому что они ели быстрее','потому что они ели меньше','потому что еда была вкуснее','потому что они не любили компьютеры','A'),
        Q5kz(22,'russian','Если во время трапезы вы отвлекаетесь на постороннюю деятельность, то съедаете больше пищи, что ведёт к перееданию. Учёные из Бристольского университета исследовали две группы испытуемых: представители первой ели не отвлекаясь, участники второй питались, играя на компьютере или просматривая телепередачи. Организм второй группы «забывал» тщательно пережёвывать пищу и оценивать уровень насыщения, поэтому они съедали вдвое больше.\n\nЧто означает выражение «внешние раздражители»?','громкая музыка','компьютерная игра и телепередача','запах пищи','окружающие люди','B'),
        Q5kz(23,'russian','Девяти алматинкам выпала честь участвовать в фотосессии и надеть национальные костюмы, чтобы показать красоту казахской культуры. Каждая девушка представляла определённый регион Казахстана. На снимках — не просто лица, а символы традиций, женственности и гордости. Эти фотографии напомнили людям, что красота заключается в уважении к своим корням.\n\nКакова цель фотосессии?','показать моду нового сезона','продемонстрировать национальную красоту','рекламировать одежду','провести конкурс','B'),
        Q5kz(24,'russian','Девяти алматинкам выпала честь участвовать в фотосессии и надеть национальные костюмы, чтобы показать красоту казахской культуры. Каждая девушка представляла определённый регион Казахстана. На снимках — не просто лица, а символы традиций, женственности и гордости. Эти фотографии напомнили людям, что красота заключается в уважении к своим корням.\n\nЧто символизируют девушки на фотографиях?','современные тенденции','развитие искусства','модные украшения','традиции и культуру народа','D'),
        Q5kz(25,'russian','Учёные выяснили, что использование телефона перед сном влияет на качество отдыха. Экран телефона излучает яркий свет, который мешает выработке гормона сна — мелатонина. Из-за этого человек засыпает позже и чувствует себя уставшим утром. Особенно это заметно у подростков, которые часто переписываются перед сном. Чтобы хорошо высыпаться, специалисты советуют убирать гаджеты за час до сна и читать обычную книгу.\n\nПочему людям трудно заснуть, если они пользуются телефоном перед сном?','Потому что экран мешает выработке мелатонина','Потому что телефон шумит','Потому что люди не устали','Потому что книги скучные','A'),
        Q5kz(26,'russian','Учёные выяснили, что использование телефона перед сном влияет на качество отдыха. Экран телефона излучает яркий свет, который мешает выработке гормона сна — мелатонина. Из-за этого человек засыпает позже и чувствует себя уставшим утром. Особенно это заметно у подростков, которые часто переписываются перед сном. Чтобы хорошо высыпаться, специалисты советуют убирать гаджеты за час до сна и читать обычную книгу.\n\nКакой совет дают специалисты?','Смотреть фильмы перед сном','Использовать гаджеты до поздней ночи','Убрать телефон и читать книгу перед сном','Спать днём вместо ночи','C'),
        Q5kz(27,'russian','Учёные давно заметили, что музыка влияет не только на настроение, но и на работу мозга. Те, кто слушал спокойные мелодии, справлялись с заданиями быстрее и делали меньше ошибок. Музыка помогает сосредоточиться, если она не слишком громкая. Однако тяжёлая или слишком быстрая музыка может мешать запоминанию информации, потому что мозг устаёт от лишнего шума.\n\nПочему спокойная музыка помогает в учёбе?','Потому что она делает человека весёлым','Потому что она мешает шуму','Потому что она громкая','Потому что она помогает сосредоточиться','D'),
        Q5kz(28,'russian','Учёные давно заметили, что музыка влияет не только на настроение, но и на работу мозга. Те, кто слушал спокойные мелодии, справлялись с заданиями быстрее и делали меньше ошибок. Музыка помогает сосредоточиться, если она не слишком громкая. Однако тяжёлая или слишком быстрая музыка может мешать запоминанию информации, потому что мозг устаёт от лишнего шума.\n\nПочему тяжёлая музыка мешает?','Она утомляет мозг и отвлекает внимание','Она помогает быстрее решать задачи','Она улучшает память','Она делает человека внимательнее','A'),
        Q5kz(29,'russian','Учёные давно заметили, что музыка влияет не только на настроение, но и на работу мозга. Те, кто слушал спокойные мелодии, справлялись с заданиями быстрее и делали меньше ошибок. Музыка помогает сосредоточиться, если она не слишком громкая. Однако тяжёлая или слишком быстрая музыка может мешать запоминанию информации, потому что мозг устаёт от лишнего шума. Некоторые педагоги советуют включать лёгкую инструментальную музыку. Но учёные предупреждают: музыка не заменяет внимательность и труд.\n\nКакую основную мысль выражает автор?','Музыка — лучший способ стать отличником','Музыка помогает, но главное — внимание и труд','Учёба без музыки невозможна','Быстрая музыка улучшает память','B'),
        Q5kz(30,'russian','Осенью деревья становятся особенно красивыми. Листья окрашиваются в жёлтые, красные и оранжевые оттенки. Учёные объясняют это тем, что с понижением температуры в листьях уменьшается количество зелёного вещества — хлорофилла. Когда хлорофилл разрушается, проявляются другие пигменты, которые раньше были «спрятаны» под зелёным цветом.\n\nПочему листья осенью меняют цвет?','Потому что деревья становятся старше','Потому что солнце светит ярче','Потому что исчезает зелёный пигмент — хлорофилл','Потому что идёт дождь','C'),
        // АНГЛИЙСКИЙ Q31-40
        Q5kz(31,'english','Tom loves animals. Every Saturday, he visits the city zoo with his father. His favorite animal is the giraffe because it is very tall and friendly. Tom always takes photos of the giraffes and feeds them leaves. One day, a baby giraffe was born, and Tom named it "Sunny."\n\nWhy does Tom visit the zoo every Saturday?','Because he works there','Because he loves animals','Because his school is near the zoo','Because he wants to see his friends','B'),
        Q5kz(32,'english','Emma loves reading books after school. She goes to the library every Wednesday. Her favorite stories are about space and astronauts. Emma dreams of becoming an astronaut one day. She always imagines flying to the Moon in her own rocket. Last week, she borrowed three new books about planets. She finished them all in just two days!\n\nWhat does Emma want to be in the future?','A teacher','A doctor','An astronaut','A writer','C'),
        Q5kz(33,'english','Liam and his family live near the mountains. Every Sunday, they go hiking together. Liam loves the fresh air and the sound of birds. He often takes pictures of flowers and butterflies. His mother prepares sandwiches for lunch. Sometimes they sit near a small river and rest.\n\nWhat does Liam\'s family do every Sunday?','They go shopping','They go hiking','They visit friends','They watch movies','B'),
        Q5kz(34,'english','Sophia has a small puppy named Max. He is white and very playful. Every morning, Max runs around the garden and chases butterflies. Sophia feeds him milk and dog food. When she goes to school, Max waits near the door. In the evening, they play with a red ball.\n\nWhat color is Sophia\'s puppy?','Brown','Black','White','Gray','C'),
        Q5kz(35,'english','Jack loves helping his parents in the kitchen. His favorite food is pancakes. On Saturdays, he helps his mom make them for breakfast. He mixes flour, milk, and eggs. Then his dad cooks them on a big pan. Jack puts honey on top and eats five pancakes!\n\nWhat does Jack put on his pancakes?','Jam','Chocolate','Butter','Honey','D'),
        Q5kz(36,'english','Olivia has a big garden behind her house. She grows flowers, tomatoes, and carrots. Every morning she waters the plants with her small green watering can. Sometimes her grandmother helps her. Olivia loves watching the flowers bloom in spring. She also gives vegetables to her neighbors.\n\nWhat does Olivia grow in her garden?','Fruits and trees','Flowers and vegetables','Only flowers','Only carrots','B'),
        Q5kz(37,'english','Ethan likes playing football with his friends. They play after school in the park. Ethan is the team captain and always wears a red T-shirt. His best friend Ben is the goalkeeper. Last week their team won a small local match.\n\nWhat color is Ethan\'s T-shirt?','Blue','Green','Red','Yellow','C'),
        Q5kz(38,'english','Mia\'s birthday was last Saturday. She invited ten friends to her party. There were balloons, music, and a big chocolate cake. Everyone danced and played games. Mia\'s parents gave her a new pink bicycle as a gift.\n\nWhat present did Mia get for her birthday?','A doll','A book','A bicycle','A phone','C'),
        Q5kz(39,'english','Lily loves spending time in her grandmother\'s kitchen. Every weekend, they bake cookies together. Her grandmother teaches her how to mix the dough and measure sugar and flour. The kitchen always smells sweet when the cookies are ready.\n\nWhat does Lily enjoy doing with her grandmother?','Planting flowers','Watching TV','Baking cookies','Drawing pictures','C'),
        Q5kz(40,'english','Noah lives near the sea. Every morning, he walks along the beach and watches the sunrise. He likes listening to the sound of the waves and collecting seashells. One day, he found a small bottle with a message inside. It was a letter from a boy in another country who also loved the ocean.\n\nWhat did Noah find on the beach?','A map','A treasure box','A shell collection','A bottle with a message','D'),
      ];
      for (const q of qs5kz) await setDoc(doc(db, 'questions', `q-${test5kzId}-${q.question_number}`), q);
    }
    _sampleDataEnsured = true;
  } catch (error) {
    console.error("Diagnostic data initialization error:", error);
  }
}

export async function getTests(): Promise<Test[]> {
  const db = getDb();
  await ensureSampleData();
  const querySnapshot = await getDocs(collection(db, 'tests'));
  const tests = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return serializeData(tests) as any;
}

export async function getTestById(id: string): Promise<Test | null> {
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'tests', id));
  if (docSnap.exists()) {
    return serializeData({ id: docSnap.id, ...docSnap.data() }) as any;
  }
  return null;
}

export async function generateTopicsForTest(classNum: number, lang: string): Promise<{ updated: number; skipped: number }> {
  const db = getDb();
  const querySnapshot = await getDocs(collection(db, 'questions'));
  const questions = querySnapshot.docs
    .map(d => ({ docId: d.id, ...(d.data() as any) }))
    .filter(q => q.class_number === classNum && q.language === lang)
    .sort((a: any, b: any) => a.question_number - b.question_number);

  if (!questions.length) return { updated: 0, skipped: 0 };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const BATCH = 15;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    const list = batch.map((q: any) => {
      const subj = q.subject;
      let text = q.question_text || '';
      // For quantitative questions, only show the numbers
      if (subj === 'quantitative') {
        const parts = text.split('|||');
        text = `A=${parts[0]?.trim()}, B=${parts[1]?.trim()}`;
      } else {
        text = text.replace(/<[^>]+>/g, '').slice(0, 150);
      }
      return `Q${q.question_number} [${subj}]: ${text}`;
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
    const results: Array<{ n: number; topic: string }> = JSON.parse(jsonText);

    for (const r of results) {
      const q = batch.find((q: any) => q.question_number === r.n);
      if (!q || !r.topic) { skipped++; continue; }
      await updateDoc(doc(db, 'questions', q.docId), { topic: r.topic });
      updated++;
    }
  }

  return { updated, skipped };
}

export async function startTest(data: {
  testId: string;
  name: string;
  city: string;
  whatsapp: string;
  classNumber: number;
  language: 'kz' | 'ru';
}) {
  const db = getDb();
  await ensureSampleData();
  
  const testsSnapshot = await getDocs(collection(db, 'tests'));
  const targetTest = testsSnapshot.docs.find(d => {
    const t = d.data();
    return t.class_number === data.classNumber && t.language === data.language && t.is_active;
  });

  const testIdToUse = targetTest ? targetTest.id : 'test-1';

  const questionsSnapshot = await getDocs(collection(db, 'questions'));
  const questions = questionsSnapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Question))
    .filter(q => q.test_id === testIdToUse);

  if (questions.length === 0) {
    throw new Error("Вопросы для выбранного класса и языка еще не добавлены.");
  }

  const resultData = {
    test_id: testIdToUse,
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
    started_at: new Date().toISOString(),
    is_analysed: false,
    anti_cheat_count: 0,
    is_contacted: false,
    is_consulted: false,
  };

  const docRef = await addDoc(collection(db, 'results'), resultData);
  revalidatePath('/admin/dashboard');
  return serializeData({ id: docRef.id, ...resultData });
}

export async function submitAnswer(data: {
  resultId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
}) {
  const db = getDb();
  const qSnap = await getDoc(doc(db, 'questions', data.questionId));
  if (!qSnap.exists()) return;
  const question = qSnap.data() as Question;

  const answerRef = doc(db, 'results', data.resultId, 'answers', data.questionId);
  await setDoc(answerRef, {
    result_id: data.resultId,
    question_id: data.questionId,
    question_number: question.question_number,
    subject: question.subject,
    student_answer: data.answer,
    correct_answer: question.correct_answer || '',
    is_correct: data.answer === question.correct_answer,
    time_spent_seconds: data.timeSpent,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

export async function finishTest(resultId: string): Promise<StudentResult> {
  const db = getDb();
  const resultRef = doc(db, 'results', resultId);
  const resultSnap = await getDoc(resultRef);
  if (!resultSnap.exists()) throw new Error('Result not found');

  const classNumber = resultSnap.data().class_number || 0;
  const testId = resultSnap.data().test_id;

  const getQuestionPoints = (q: any) => {
    if (q?.points) return Number(q.points);
    if (classNumber === 6) return q?.subject === 'quantitative' ? 10 : 20;
    return 10;
  };

  const questionsSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', testId)));
  const questionsMap = new Map(questionsSnap.docs.map(d => [d.id, d.data()]));
  const maxScore = questionsSnap.docs.reduce((sum, d) => sum + getQuestionPoints(d.data()), 0);

  const answersSnap = await getDocs(collection(db, 'results', resultId, 'answers'));
  const correctCount = answersSnap.docs.filter(d => d.data().is_correct).length;
  const totalScore = answersSnap.docs.reduce((sum, d) => {
    if (!d.data().is_correct) return sum;
    const questionId = d.data().question_id || d.id;
    return sum + getQuestionPoints(questionsMap.get(questionId));
  }, 0);

  const totalQuestions = resultSnap.data().total_questions || 0;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  await updateDoc(resultRef, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    total_correct: correctCount,
    percentage: percentage,
    total_score: totalScore,
    max_score: maxScore,
  });

  revalidatePath('/admin/dashboard');
  const finalSnap = await getDoc(resultRef);
  return serializeData({ id: resultId, ...finalSnap.data() }) as any;
}

export async function getResultDetail(id: string) {
  const db = getDb();
  const resultSnap = await getDoc(doc(db, 'results', id));
  if (!resultSnap.exists()) return null;

  const answersSnap = await getDocs(collection(db, 'results', id, 'answers'));
  const logsSnap = await getDocs(collection(db, 'results', id, 'logs'));
  
  const resultData = resultSnap.data();
  
  const questionsSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', resultData.test_id)));
  const questions = questionsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Question));

  return serializeData({
    result: { id: resultSnap.id, ...resultData } as StudentResult,
    answers: answersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)),
    logs: logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)),
    testQuestions: questions.sort((a, b) => a.question_number - b.question_number),
  });
}

export async function getAllResults() {
  const db = getDb();
  const qSnapshot = await getDocs(collection(db, 'results'));
  const results = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return serializeData(results) as any;
}

export async function getClassStats(classNumber: number, language: string): Promise<{
  count: number; avg: number; max: number; min: number; median: number; percentages: number[];
} | null> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'results'));
  const pcts = snap.docs
    .map(d => d.data())
    .filter(r => r.class_number === classNumber && r.language === language && r.status === 'completed')
    .map(r => r.percentage as number)
    .sort((a, b) => a - b);
  if (!pcts.length) return null;
  const avg = Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
  return { count: pcts.length, avg, max: pcts[pcts.length - 1], min: pcts[0], median: pcts[Math.floor(pcts.length / 2)], percentages: pcts };
}

export async function updateResultCRM(id: string, updates: { is_contacted?: boolean; is_consulted?: boolean; consultation_refused?: boolean }) {
  const db = getDb();
  await updateDoc(doc(db, 'results', id), updates);
  revalidatePath('/admin/dashboard');
  return { id, ...updates };
}

export async function logAntiCheat(data: {
  resultId: string;
  eventType: 'tab_switch' | 'window_blur';
  questionNumber: number;
  duration: number;
  details: string;
}) {
  const db = getDb();
  const resultRef = doc(db, 'results', data.resultId);
  const resultSnap = await getDoc(resultRef);
  if (!resultSnap.exists() || resultSnap.data().status === 'completed') return;

  await addDoc(collection(db, 'results', data.resultId, 'logs'), {
    result_id: data.resultId,
    event_type: data.eventType,
    question_number: data.questionNumber,
    exit_duration_seconds: data.duration,
    details: data.details,
    created_at: new Date().toISOString(),
  });

  await updateDoc(resultRef, {
    anti_cheat_count: (resultSnap.data().anti_cheat_count || 0) + 1
  });
}

export async function analyzeResult(resultId: string) {
  const detail = await getResultDetail(resultId) as any;
  if (!detail || detail.result.status !== 'completed') throw new Error('Result not ready');

  const analysis = await analyzeStudentResult({
    studentName: detail.result.student_name,
    classNumber: detail.result.class_number,
    language: detail.result.language,
    percentage: detail.result.percentage,
    totalCorrect: detail.result.total_correct,
    totalQuestions: detail.result.total_questions,
    answers: detail.testQuestions.map((q: any) => {
      const answer = (detail.answers as any[]).find(a => a.question_id === q.id);
      return {
        questionNumber: q.question_number,
        subject: q.subject,
        questionText: q.question_text,
        topic: q.topic ?? null,
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
  });

  const ai_analysis = { analysis_json: analysis, student_name: detail.result.student_name, class_number: detail.result.class_number, percentage: detail.result.percentage };
  const db = getDb();
  await updateDoc(doc(db, 'results', resultId), { is_analysed: true, ai_analysis: serializeData(ai_analysis) });
  revalidatePath(`/admin/results/${resultId}`);
  return serializeData(ai_analysis);
}

export async function clearAnalysis(resultId: string) {
  const db = getDb();
  await updateDoc(doc(db, 'results', resultId), { is_analysed: false, ai_analysis: null });
  revalidatePath(`/admin/results/${resultId}`);
}

export async function saveTest(test: Test): Promise<Test> {
  const db = getDb();
  const { id, ...data } = test;
  await setDoc(doc(db, 'tests', id), { ...data, updated_at: new Date().toISOString() }, { merge: true });
  revalidatePath('/admin/tests');
  return serializeData(test);
}

export async function deleteTest(testId: string): Promise<void> {
  const db = getDb();
  const qSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', testId)));
  for (const d of qSnap.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, 'tests', testId));
  revalidatePath('/admin/tests');
}

export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  const db = getDb();
  const qSnap = await getDocs(query(collection(db, 'questions'), where('test_id', '==', testId)));
  const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
  return serializeData(questions.sort((a, b) => a.question_number - b.question_number));
}

export async function importQuestionsFromFile(formData: FormData): Promise<{
  questions: Omit<Question, 'id'>[];
  error?: string;
}> {
  const file = formData.get('file') as File | null;
  if (!file) return { questions: [], error: 'Файл не выбран' };

  const testId      = (formData.get('testId')         as string) || 'test-6-ru';
  const classNumber = parseInt((formData.get('classNumber') as string) || '6', 10);
  const language    = (formData.get('language')        as string) || 'ru';
  const startingNum = parseInt((formData.get('startingNumber') as string) || '1', 10);
  const subjectHint = (formData.get('subject')         as string) || '';

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const isPDF  = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const subjectList = 'math | quantitative | science | kazakh | russian | english | logic';

  const prompt = `Ты — инструмент для извлечения тестовых вопросов из документов для учебного центра go2study (подготовка к НИШ).

Извлеки ВСЕ вопросы с вариантами ответов из документа.

ВАЖНО — для вопросов типа "Количественные характеристики" (два столбца A и B):
  question_text должен быть в формате: "Значение А|||Значение В"
  Варианты автоматически: A=Столбец А больше, B=Столбец В больше, C=Значения равны, D=Нельзя определить

Допустимые значения subject: ${subjectList}
${subjectHint && subjectHint !== 'auto' ? `Все вопросы относятся к предмету: ${subjectHint}` : 'Определи subject автоматически из контекста каждого вопроса.'}

Нумерацию вопросов начни с ${startingNum}.

Верни ТОЛЬКО валидный JSON массив без markdown-блоков:
[
  {
    "question_number": ${startingNum},
    "subject": "math",
    "question_text": "текст вопроса",
    "option_a": "вариант A",
    "option_b": "вариант B",
    "option_c": "вариант C",
    "option_d": "вариант D",
    "option_e": "",
    "correct_answer": "A"
  }
]

Если правильный ответ не указан в документе — оставь correct_answer пустой строкой "".`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let messageContent: Anthropic.MessageParam['content'];

  if (isPDF) {
    messageContent = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      } as any,
      { type: 'text', text: prompt },
    ];
  } else {
    const text = Buffer.from(bytes).toString('utf-8');
    messageContent = `${prompt}\n\nСодержимое документа:\n${text}`;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: messageContent }],
  });

  const raw = message.content[0];
  if (raw.type !== 'text') throw new Error('Неожиданный тип ответа от ИИ');

  const jsonText = raw.text.replace(/```json\n?|\n?```/g, '').trim();
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('ИИ не вернул список вопросов. Попробуйте другой файл.');

  const extracted: any[] = JSON.parse(jsonMatch[0]);

  const questions: Omit<Question, 'id'>[] = extracted.map((q, idx) => ({
    test_id:         testId,
    question_number: q.question_number ?? (startingNum + idx),
    subject:         (q.subject as Subject) || (subjectHint as Subject) || 'math',
    question_text:   q.question_text  || '',
    option_a:        q.option_a       || '',
    option_b:        q.option_b       || '',
    option_c:        q.option_c       || '',
    option_d:        q.option_d       || '',
    option_e:        q.option_e       || '',
    correct_answer:  q.correct_answer || '',
    class_number:    classNumber,
    language:        language,
  } as any));

  return { questions };
}