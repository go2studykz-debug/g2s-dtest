import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { stripMarkdown } from '@/lib/utils';

// Fonts are registered by the caller (API route or server context)

const PRIMARY = '#14bf96';
const DARK = '#081d3a';
const MUTED = '#6b7280';

const SUBJECTS: Record<string, string> = {
  math: 'Математика', quantitative: 'Кол. хар.', logic: 'Логика',
  science: 'Естествознание', kazakh: 'Казахский', russian: 'Русский', english: 'Английский',
};

function stripLatex(text: string): string {
  if (!text) return '';
  let result = text.replace(/\$([^$]*)\$/g, (_: string, inner: string) => {
    let t = inner;
    t = t.replace(/\{,\}/g, ',').replace(/\{\.\}/g, '.');
    t = t.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
    t = t.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
    t = t.replace(/\\sqrt/g, '√');
    t = t.replace(/\\cdot/g, '·');
    t = t.replace(/\\times/g, '×');
    t = t.replace(/\\div/g, '÷');
    t = t.replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠');
    t = t.replace(/\\%/g, '%');
    t = t.replace(/\\\$/g, '$');
    t = t.replace(/\\text\{([^}]*)\}/g, '$1');
    t = t.replace(/\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\[a-zA-Z]+/g, '');
    return t.replace(/\s+/g, ' ').trim();
  });
  result = result.replace(/\\,/g, ' ');
  return result;
}

function cleanText(text: string): string {
  return stripLatex(stripMarkdown(text || ''));
}

function formatQText(subject: string, text: string): string {
  if (subject === 'quantitative') {
    const parts = text.split('|||');
    if (parts.length >= 3) {
      const cond = cleanText(parts[0]);
      const a = cleanText(parts[1]);
      const b = cleanText(parts[2]);
      return cond ? `${cond} | А: ${a} | В: ${b}` : `А: ${a} | В: ${b}`;
    }
    return `А: ${cleanText(parts[0])} | В: ${cleanText(parts[1])}`;
  }
  const clean = cleanText(text);
  return clean.length > 120 ? clean.slice(0, 120) + '…' : clean;
}

function getOptionText(q: any, letter: string | null): string {
  if (!letter) return '—';
  if (q.subject === 'quantitative') {
    const map: Record<string, string> = { A: 'А больше', B: 'В больше', C: 'Равны', D: 'Нельзя определить' };
    return `${letter} — ${map[letter] || ''}`;
  }
  const raw = (q as any)[`option_${letter.toLowerCase()}`] || '';
  const clean = cleanText(raw);
  const short = clean.length > 45 ? clean.slice(0, 45) + '…' : clean;
  return short ? `${letter} — ${short}` : letter;
}

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', padding: 28, backgroundColor: '#fff', color: DARK, fontSize: 8 },

  headerWrap: { marginBottom: 14, borderRadius: 6, overflow: 'hidden' },
  headerAccent: { height: 3, backgroundColor: PRIMARY },
  headerMain: { backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  headerBrand: { width: 120, paddingRight: 14, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.12)', borderRightStyle: 'solid' },
  headerBrandLogo: { color: PRIMARY, fontSize: 20, fontWeight: 700, marginBottom: 3 },
  headerBrandSite: { color: 'rgba(255,255,255,0.35)', fontSize: 7 },
  headerCenter: { flex: 1, paddingHorizontal: 16 },
  headerReportTag: { color: 'rgba(255,255,255,0.4)', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  headerReportTitle: { color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 3 },
  headerReportSub: { color: 'rgba(255,255,255,0.45)', fontSize: 7, lineHeight: 1.4 },
  headerScoreBlock: { alignItems: 'center', paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)', borderLeftStyle: 'solid', minWidth: 80 },
  headerScoreNum: { color: PRIMARY, fontSize: 38, fontWeight: 700 },
  headerScoreLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 7, marginTop: 1 },
  headerScoreSub: { color: '#fff', fontSize: 8, fontWeight: 700, marginTop: 4 },
  headerInfoBar: { backgroundColor: '#0c2347', paddingHorizontal: 16, paddingVertical: 7, flexDirection: 'row', gap: 0, flexWrap: 'nowrap' },
  headerInfoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  headerInfoLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginRight: 3 },
  headerInfoVal: { color: '#fff', fontSize: 7.5, fontWeight: 700 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderColor: '#e3e8ee', padding: 8, alignItems: 'center' },
  statLabel: { fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase', color: MUTED, letterSpacing: 0.4, marginBottom: 2 },
  statVal: { fontSize: 13, fontWeight: 700, color: DARK },
  statValGreen: { fontSize: 13, fontWeight: 700, color: '#16a34a' },
  statValRed: { fontSize: 13, fontWeight: 700, color: '#dc2626' },

  tableHead: { flexDirection: 'row', backgroundColor: DARK, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 4, marginBottom: 2 },
  thTxt: { fontSize: 6.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.3 },

  cNum:  { width: 24, paddingRight: 4 },
  cSubj: { width: 72, paddingRight: 8 },
  cQ:    { flex: 1,   paddingRight: 10 },
  cAns:  { width: 130, paddingRight: 8 },
  cRight:{ width: 130, paddingRight: 8 },
  cTime: { width: 36, alignItems: 'center', paddingRight: 4 },
  cMark: { width: 18, alignItems: 'center' },

  row: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#e3e8ee', alignItems: 'flex-start' },
  rowEven: { backgroundColor: '#f8fafc' },
  rowOdd:  { backgroundColor: '#fff' },

  cellTxt:  { fontSize: 7.5, color: DARK },
  cellMuted:{ fontSize: 7, color: MUTED },
  correct:  { fontSize: 7.5, color: '#16a34a', fontWeight: 700 },
  wrong:    { fontSize: 7.5, color: '#dc2626', fontWeight: 700 },
  skipped:  { fontSize: 7.5, color: MUTED },
  ansRight: { fontSize: 7.5, color: PRIMARY, fontWeight: 700 },
  mark:     { fontSize: 9, fontWeight: 700 },

  acSection: { marginTop: 18 },
  acHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  acTitle: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#dc2626', marginRight: 8 },
  acBadge: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  acBadgeTxt: { fontSize: 7, fontWeight: 700, color: '#dc2626' },
  acNone: { fontSize: 8, color: MUTED, backgroundColor: '#f8fafc', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#e3e8ee' },
  acTableHead: { flexDirection: 'row', backgroundColor: '#7f1d1d', paddingVertical: 5, paddingHorizontal: 4, borderRadius: 4, marginBottom: 2 },
  acThTxt: { fontSize: 6.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.3 },
  acCTime: { width: 48, paddingRight: 6 },
  acCQ:    { width: 52, paddingRight: 6 },
  acCEvt:  { width: 90, paddingRight: 8 },
  acCDur:  { width: 64, paddingRight: 8 },
  acCDet:  { flex: 1 },
  acRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#fecaca', alignItems: 'flex-start' },
  acRowEven: { backgroundColor: '#fff5f5' },
  acRowOdd:  { backgroundColor: '#fff' },
  acCellTxt: { fontSize: 7.5, color: DARK },
  acCellRed: { fontSize: 7.5, color: '#dc2626', fontWeight: 700 },

  subjSection: { marginBottom: 14 },
  subjTitle: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: DARK, marginBottom: 6 },
  subjGrid: { flexDirection: 'row', gap: 6 },
  subjCard: { flex: 1, borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 4, overflow: 'hidden' },
  subjCardHead: { backgroundColor: '#081d3a', paddingHorizontal: 8, paddingVertical: 4 },
  subjCardName: { fontSize: 7, fontWeight: 700, color: '#fff' },
  subjCardBody: { padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subjScore: { fontSize: 14, fontWeight: 700 },
  subjScoreGood: { color: '#16a34a' },
  subjScoreMid:  { color: '#ca8a04' },
  subjScoreBad:  { color: '#dc2626' },
  subjTotal: { fontSize: 7, color: MUTED },
  subjPct: { fontSize: 9, fontWeight: 700, color: MUTED },

  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, borderTopWidth: 1, borderTopColor: '#e3e8ee', borderTopStyle: 'solid', paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 6.5, color: MUTED },
});

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60), s2 = sec % 60;
  return `${m}:${s2 < 10 ? '0' : ''}${s2}`;
}

interface Props {
  result: any;
  answers: any[];
  questions: any[];
  logs: any[];
}

export function TestDetailsPdf({ result, answers, questions, logs }: Props) {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const wrong   = answers.filter(a => !a.is_correct && a.student_answer).length;
  const skipped = questions.length - answers.filter(a => a.student_answer).length;

  // Total duration
  const duration = (() => {
    if (!result.started_at || !result.completed_at) return '—';
    const sec = Math.floor((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м ${s2}с`;
  })();

  // Subject breakdown
  const subjStats = Object.entries(SUBJECTS)
    .map(([key, label]) => {
      const qs = questions.filter((q: any) => q.subject === key);
      if (qs.length === 0) return null;
      const correct = answers.filter((a: any) => {
        const q = questions.find((qq: any) => qq.id === a.question_id);
        return q?.subject === key && a.is_correct;
      }).length;
      const pct = Math.round((correct / qs.length) * 100);
      return { label, total: qs.length, correct, pct };
    })
    .filter(Boolean) as { label: string; total: number; correct: number; pct: number }[];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.headerWrap}>
          <View style={s.headerAccent} />
          <View style={s.headerMain}>
            {/* Brand */}
            <View style={s.headerBrand}>
              <Text style={s.headerBrandLogo}>go2study</Text>
              <Text style={s.headerBrandSite}>go2study.kz • Казахстан</Text>
            </View>
            {/* Report info */}
            <View style={s.headerCenter}>
              <Text style={s.headerReportTag}>Официальный документ</Text>
              <Text style={s.headerReportTitle}>Диагностический отчёт</Text>
              <Text style={s.headerReportSub}>Подготовительное тестирование для поступления в специализированные школы</Text>
            </View>
            {/* Score */}
            <View style={s.headerScoreBlock}>
              <Text style={s.headerScoreNum}>{result.percentage}%</Text>
              <Text style={s.headerScoreLabel}>результат</Text>
              <Text style={s.headerScoreSub}>{result.total_correct}/{result.total_questions}</Text>
              <Text style={s.headerScoreLabel}>верных ответов</Text>
            </View>
          </View>
          {/* Info bar */}
          <View style={s.headerInfoBar}>
            {[
              { label: 'Ученик',    val: result.student_name },
              { label: 'Класс',     val: `${result.class_number} класс` },
              { label: 'Язык',      val: result.language?.toUpperCase() },
              { label: 'Город',     val: result.student_city },
              { label: 'Время',     val: duration },
              { label: 'WhatsApp',  val: result.parent_whatsapp || '—' },
              { label: 'Дата',      val: date },
            ].map(({ label, val }) => (
              <View key={label} style={s.headerInfoItem}>
                <Text style={s.headerInfoLabel}>{label}:</Text>
                <Text style={s.headerInfoVal}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'Правильных', val: String(result.total_correct), style: s.statValGreen },
            { label: 'Ошибок',     val: String(wrong),                style: s.statValRed  },
            { label: 'Пропущено',  val: String(skipped),              style: s.statVal     },
            { label: 'Всего',      val: String(result.total_questions),style: s.statVal     },
          ].map(({ label, val, style }) => (
            <View key={label} style={s.statBox}>
              <Text style={s.statLabel}>{label}</Text>
              <Text style={style}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Subject breakdown */}
        <View style={s.subjSection}>
          <Text style={s.subjTitle}>Результаты по предметам</Text>
          <View style={s.subjGrid}>
            {subjStats.map(({ label, total, correct, pct }) => {
              const scoreStyle = pct >= 70 ? s.subjScoreGood : pct >= 50 ? s.subjScoreMid : s.subjScoreBad;
              return (
                <View key={label} style={s.subjCard}>
                  <View style={s.subjCardHead}>
                    <Text style={s.subjCardName}>{label}</Text>
                  </View>
                  <View style={s.subjCardBody}>
                    <View>
                      <Text style={[s.subjScore, scoreStyle]}>{correct}/{total}</Text>
                      <Text style={s.subjTotal}>вопросов</Text>
                    </View>
                    <Text style={[s.subjPct, scoreStyle]}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.tableHead} fixed>
          <View style={s.cNum}> <Text style={s.thTxt}>№</Text></View>
          <View style={s.cSubj}><Text style={s.thTxt}>Предмет</Text></View>
          <View style={s.cQ}>   <Text style={s.thTxt}>Вопрос</Text></View>
          <View style={s.cAns}> <Text style={s.thTxt}>Ответ ученика</Text></View>
          <View style={s.cRight}><Text style={s.thTxt}>Правильный ответ</Text></View>
          <View style={s.cTime}><Text style={s.thTxt}>Время</Text></View>
          <View style={s.cMark}><Text style={s.thTxt}> </Text></View>
        </View>

        {questions.map((q: any, i: number) => {
          const ans       = answers.find((a: any) => a.question_id === q.id);
          const isCorrect = ans?.is_correct;
          const stuLetter = ans?.student_answer ?? null;
          const correctLetter = q.correct_answer;

          const stuText     = getOptionText(q, stuLetter);
          const correctText = getOptionText(q, correctLetter);

          return (
            <View key={q.id} style={[s.row, i % 2 === 0 ? s.rowEven : s.rowOdd]} wrap={false}>
              <View style={s.cNum}> <Text style={[s.cellMuted, { fontWeight: 700 }]}>{q.question_number}</Text></View>
              <View style={s.cSubj}><Text style={s.cellTxt}>{SUBJECTS[q.subject] || q.subject}</Text></View>
              <View style={s.cQ}>   <Text style={s.cellTxt}>{formatQText(q.subject, q.question_text)}</Text></View>
              <View style={s.cAns}>
                {stuLetter
                  ? <Text style={isCorrect ? s.correct : s.wrong}>{stuText}</Text>
                  : <Text style={s.skipped}>— Пропуск</Text>}
              </View>
              <View style={s.cRight}><Text style={s.ansRight}>{correctText}</Text></View>
              <View style={s.cTime}><Text style={s.cellMuted}>{ans ? fmtTime(ans.time_spent_seconds) : '—'}</Text></View>
              <View style={s.cMark}><Text style={s.mark}>{!stuLetter ? '' : isCorrect ? '✓' : '✗'}</Text></View>
            </View>
          );
        })}

        {/* Anti-cheat section */}
        <View style={s.acSection}>
          <View style={s.acHeader}>
            <Text style={s.acTitle}>Журнал прокторинга</Text>
            <View style={s.acBadge}>
              <Text style={s.acBadgeTxt}>{logs.length} нарушений</Text>
            </View>
          </View>
          {logs.length === 0 ? (
            <Text style={s.acNone}>Нарушений не зафиксировано</Text>
          ) : (
            <>
              <View style={s.acTableHead}>
                <View style={s.acCTime}><Text style={s.acThTxt}>Время</Text></View>
                <View style={s.acCQ}>   <Text style={s.acThTxt}>Вопрос №</Text></View>
                <View style={s.acCEvt}> <Text style={s.acThTxt}>Событие</Text></View>
                <View style={s.acCDur}> <Text style={s.acThTxt}>Вне теста</Text></View>
                <View style={s.acCDet}> <Text style={s.acThTxt}>Детали</Text></View>
              </View>
              {logs.map((log: any, i: number) => {
                const t = new Date(log.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dur = log.exit_duration_seconds > 0 ? `${log.exit_duration_seconds} сек` : '—';
                const evt = log.event_type === 'tab_switch' ? 'Смена вкладки' : 'Потеря фокуса';
                return (
                  <View key={i} style={[s.acRow, i % 2 === 0 ? s.acRowEven : s.acRowOdd]} wrap={false}>
                    <View style={s.acCTime}><Text style={s.acCellTxt}>{t}</Text></View>
                    <View style={s.acCQ}>   <Text style={s.acCellRed}>№ {log.question_number}</Text></View>
                    <View style={s.acCEvt}> <Text style={s.acCellTxt}>{evt}</Text></View>
                    <View style={s.acCDur}> <Text style={s.acCellRed}>{dur}</Text></View>
                    <View style={s.acCDet}> <Text style={s.acCellTxt}>{log.details}</Text></View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>go2study — Детали теста · {result.student_name}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
