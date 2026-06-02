import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const PRIMARY = '#14bf96';
const DARK = '#081d3a';
const MUTED = '#6b7280';
const GREEN = '#16a34a';
const GREEN_BG = '#f0fdf4';
const GREEN_BORDER = '#bbf7d0';
const ORANGE = '#ea580c';
const ORANGE_BG = '#fff7ed';
const ORANGE_BORDER = '#fed7aa';
const RED = '#dc2626';
const RED_BG = '#fef2f2';
const RED_BORDER = '#fecaca';
const YELLOW_COL = '#ca8a04';
const YELLOW_BG = '#fefce8';
const YELLOW_BORDER = '#fde68a';

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', padding: 36, backgroundColor: '#fff', color: DARK, fontSize: 9 },

  header: { backgroundColor: DARK, padding: 20, marginBottom: 18, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  headerLogo: { color: PRIMARY, fontSize: 13, fontWeight: 700, marginBottom: 3 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 3 },
  headerMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 8 },
  headerRight: { alignItems: 'flex-end' },
  headerPct: { color: PRIMARY, fontSize: 28, fontWeight: 700 },
  headerPctLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 7 },

  section: { marginBottom: 14 },
  sTitle: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: PRIMARY, marginBottom: 7 },

  summaryBox: { backgroundColor: '#f0f9f7', borderRadius: 5, padding: 11, borderLeftWidth: 3, borderLeftColor: PRIMARY },
  summaryText: { fontSize: 9, lineHeight: 1.65, color: DARK },

  row2: { flexDirection: 'row', gap: 8 },
  col2: { flex: 1 },

  sideCard: { borderRadius: 5, padding: 9, borderWidth: 1, marginBottom: 5 },
  sideCardGreen: { backgroundColor: GREEN_BG, borderColor: GREEN_BORDER },
  sideCardOrange: { backgroundColor: ORANGE_BG, borderColor: ORANGE_BORDER },
  sideTitle: { fontSize: 8, fontWeight: 700, marginBottom: 3 },
  sideTitleGreen: { color: GREEN },
  sideTitleOrange: { color: ORANGE },
  sideText: { fontSize: 8, lineHeight: 1.5, color: '#3b3e40' },

  tableWrap: { borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 5, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e3e8ee', paddingHorizontal: 8, paddingVertical: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f4f8', paddingHorizontal: 8, paddingVertical: 4 },
  tCell1: { flex: 3 },
  tCell2: { flex: 2 },
  tCell3: { flex: 2 },
  tCell4: { flex: 1.5, alignItems: 'flex-end' },
  tHeadTxt: { fontSize: 7, fontWeight: 700, color: MUTED, textTransform: 'uppercase' },
  tCellTxt: { fontSize: 8 },
  tCellMuted: { fontSize: 7, color: MUTED },
  skillBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, fontSize: 7, fontWeight: 700 },
  skillStrong: { backgroundColor: GREEN_BG, color: GREEN },
  skillMedium: { backgroundColor: YELLOW_BG, color: YELLOW_COL },
  skillWeak: { backgroundColor: RED_BG, color: RED },

  card: { borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 5, marginBottom: 7, overflow: 'hidden' },
  cardHead: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeadTxt: { fontSize: 8, fontWeight: 700 },
  badgeError: { backgroundColor: RED_BG, color: RED, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 7, fontWeight: 700 },
  badgeSkip: { backgroundColor: ORANGE_BG, color: ORANGE, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 7, fontWeight: 700 },
  cardBody: { padding: 9 },
  cardRow: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  cardCol: { flex: 1 },
  label: { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: 2, letterSpacing: 0.4 },
  val: { fontSize: 8, fontWeight: 700 },
  valRed: { fontSize: 8, fontWeight: 700, color: RED },
  recBox: { backgroundColor: ORANGE_BG, borderRadius: 4, padding: 7, marginTop: 4 },
  recLabel: { fontSize: 7, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 2 },
  recText: { fontSize: 8, lineHeight: 1.5 },

  textBox: { backgroundColor: '#f8fafc', borderRadius: 5, padding: 10, borderWidth: 1, borderColor: '#e3e8ee' },
  textBoxGreen: { backgroundColor: '#f0f9f7', borderRadius: 5, padding: 10, borderWidth: 1, borderColor: '#14bf96' },
  textBoxTxt: { fontSize: 9, lineHeight: 1.65 },

  priorityItem: { flexDirection: 'row', gap: 7, padding: 9, borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 5, marginBottom: 5, backgroundColor: '#f8fafc' },
  priorityDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  priorityDotTxt: { color: '#fff', fontSize: 7, fontWeight: 700 },
  priorityDir: { fontSize: 8, fontWeight: 700, marginBottom: 2 },
  priorityJust: { fontSize: 8, lineHeight: 1.4, color: '#3b3e40' },

  devBox: { borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 5, padding: 11, backgroundColor: '#f8fafc' },
  devPointA: { fontSize: 9, lineHeight: 1.6, marginBottom: 10 },
  stageRow: { flexDirection: 'row', gap: 7, marginBottom: 5 },
  stageDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stageDotTxt: { color: '#fff', fontSize: 7, fontWeight: 700 },
  stageRight: { flex: 1 },
  stageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 5 },
  stageName: { fontSize: 8, fontWeight: 700 },
  stagePeriod: { fontSize: 7, color: PRIMARY },
  stageContent: { fontSize: 8, lineHeight: 1.4, color: '#3b3e40' },
  goalBox: { backgroundColor: DARK, borderRadius: 4, padding: 9, marginTop: 8 },
  goalLabel: { fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 3 },
  goalText: { fontSize: 8, lineHeight: 1.5, color: '#fff' },

  chancesRow: { flexDirection: 'row', gap: 8 },
  chanceCard: { flex: 1, borderRadius: 5, padding: 10, alignItems: 'center', borderWidth: 1 },
  cnNoPrep: { backgroundColor: RED_BG, borderColor: RED_BORDER },
  cnGold: { backgroundColor: YELLOW_BG, borderColor: YELLOW_BORDER },
  cnVip: { backgroundColor: GREEN_BG, borderColor: GREEN_BORDER },
  chanceLabel: { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: 3 },
  chanceVal: { fontSize: 16, fontWeight: 700 },
  cvNoPrep: { color: RED },
  cvGold: { color: YELLOW_COL },
  cvVip: { color: GREEN },

  conclusionBox: { backgroundColor: DARK, borderRadius: 5, padding: 12 },
  conclusionText: { fontSize: 9, lineHeight: 1.65, color: '#fff' },

  antiCheatBox: { backgroundColor: RED_BG, borderRadius: 5, padding: 11, borderWidth: 1, borderColor: RED_BORDER },
  antiCheatText: { fontSize: 9, lineHeight: 1.65, color: '#7f1d1d' },

  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e3e8ee', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7, color: MUTED },

  scoreSummaryBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e3e8ee', borderRadius: 6, padding: 12, marginBottom: 14 },
  scoreBigRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6, gap: 4 },
  scoreBig: { fontSize: 22, fontWeight: 700, color: DARK },
  scoreOf: { fontSize: 11, color: MUTED, fontWeight: 700 },
  scoreMeta: { fontSize: 8, color: MUTED },
  subjectCardsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  subjectCard: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', minWidth: 65 },
  scGreen: { backgroundColor: GREEN_BG, borderColor: GREEN_BORDER },
  scOrange: { backgroundColor: ORANGE_BG, borderColor: ORANGE_BORDER },
  scRed: { backgroundColor: RED_BG, borderColor: RED_BORDER },
  subjectName: { fontSize: 6, fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: 2 },
  subjectPct: { fontSize: 13, fontWeight: 700 },
  spGreen: { color: GREEN },
  spOrange: { color: ORANGE },
  spRed: { color: RED },
  subjectFraction: { fontSize: 7, color: MUTED, marginTop: 1 },
});

interface SubjectScore { subject: string; earned: number; max: number; pct: number; }

interface Props {
  result: any;
  analysis: any;
  subjectScores?: SubjectScore[];
}

export function AiAnalysisPdf({ result, analysis, subjectScores }: Props) {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const a = analysis || {};

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Шапка ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerLogo}>go2study</Text>
            <Text style={s.headerName}>{result.student_name}</Text>
            <Text style={s.headerMeta}>{result.class_number} класс · {result.language?.toUpperCase()} · {result.student_city}</Text>
            <Text style={s.headerMeta}>{date}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPct}>{result.percentage}%</Text>
            <Text style={s.headerPctLabel}>результат теста</Text>
            <Text style={[s.headerPctLabel, { marginTop: 3 }]}>{result.total_correct}/{result.total_questions} верных</Text>
          </View>
        </View>

        {/* ── Score Summary ── */}
        {subjectScores && subjectScores.length > 0 && result.total_score > 0 && (
          <View style={s.scoreSummaryBox}>
            <View style={s.scoreBigRow}>
              <Text style={s.scoreBig}>{result.total_score}</Text>
              <Text style={s.scoreOf}> / {result.max_score}</Text>
              <Text style={[s.scoreMeta, { paddingBottom: 2, marginLeft: 6 }]}>
                {'Общий балл · '}{((result.total_score / (result.max_score || 1)) * 100).toFixed(1)}{'%  (офиц. '}{result.percentage}{'%)'}
              </Text>
            </View>
            <View style={s.subjectCardsRow}>
              {subjectScores.map((sc, i) => (
                <View key={i} style={[s.subjectCard, sc.pct >= 65 ? s.scGreen : sc.pct >= 40 ? s.scOrange : s.scRed]}>
                  <Text style={s.subjectName}>{sc.subject}</Text>
                  <Text style={[s.subjectPct, sc.pct >= 65 ? s.spGreen : sc.pct >= 40 ? s.spOrange : s.spRed]}>{sc.pct}%</Text>
                  <Text style={s.subjectFraction}>{sc.earned}/{sc.max}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── 1. Общая сводка ── */}
        <View style={s.section}>
          <Text style={s.sTitle}>Общая сводка</Text>
          <View style={s.summaryBox}>
            <Text style={s.summaryText}>{a.performanceSummary}</Text>
          </View>
        </View>

        {/* ── 2. Сильные стороны + Зоны роста ── */}
        {((a.strongSides?.length > 0) || (a.growthZones?.length > 0)) && (
          <View style={[s.section, s.row2]}>
            {a.strongSides?.length > 0 && (
              <View style={s.col2}>
                <Text style={s.sTitle}>Сильные стороны</Text>
                {a.strongSides.map((item: any, i: number) => (
                  <View key={i} style={[s.sideCard, s.sideCardGreen]}>
                    <Text style={[s.sideTitle, s.sideTitleGreen]}>{item.direction}</Text>
                    <Text style={s.sideText}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}
            {a.growthZones?.length > 0 && (
              <View style={s.col2}>
                <Text style={s.sTitle}>Зоны роста</Text>
                {a.growthZones.map((item: any, i: number) => (
                  <View key={i} style={[s.sideCard, s.sideCardOrange]}>
                    <Text style={[s.sideTitle, s.sideTitleOrange]}>{item.zone}</Text>
                    <Text style={s.sideText}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── 3. Карта навыков ── */}
        {a.skillsMap?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Карта навыков</Text>
            <View style={s.tableWrap}>
              <View style={s.tableHeader}>
                <View style={s.tCell1}><Text style={s.tHeadTxt}>Навык</Text></View>
                <View style={s.tCell2}><Text style={s.tHeadTxt}>Предмет</Text></View>
                <View style={s.tCell3}><Text style={s.tHeadTxt}>Уровень</Text></View>
                <View style={s.tCell4}><Text style={s.tHeadTxt}>Важность</Text></View>
              </View>
              {a.skillsMap.map((item: any, i: number) => {
                const lvl = item.level === 'сильная зона' ? s.skillStrong : item.level === 'средняя зона' ? s.skillMedium : s.skillWeak;
                return (
                  <View key={i} style={s.tableRow}>
                    <View style={s.tCell1}><Text style={s.tCellTxt}>{item.skill}</Text></View>
                    <View style={s.tCell2}><Text style={s.tCellMuted}>{item.subject}</Text></View>
                    <View style={s.tCell3}><Text style={[s.skillBadge, lvl]}>{item.level}</Text></View>
                    <View style={s.tCell4}><Text style={s.tCellMuted}>{item.examImportance}</Text></View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 4. Детализация по ошибкам ── */}
        {a.detailedAnalysis?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Детализация по ошибкам</Text>
            {a.detailedAnalysis.map((item: any, i: number) => (
              <View key={i} style={s.card} wrap={false}>
                <View style={s.cardHead}>
                  <Text style={s.cardHeadTxt}>Вопрос №{item.questionNumber}  ({item.subject})</Text>
                  <Text style={item.status === 'Ошибка' ? s.badgeError : s.badgeSkip}>{item.status}</Text>
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardRow}>
                    <View style={s.cardCol}>
                      <Text style={s.label}>Тема</Text>
                      <Text style={s.val}>{item.topic}</Text>
                    </View>
                    <View style={s.cardCol}>
                      <Text style={s.label}>Тип ошибки</Text>
                      <Text style={s.valRed}>{item.errorType}</Text>
                    </View>
                    {item.timeCategory && (
                      <View style={s.cardCol}>
                        <Text style={s.label}>Время</Text>
                        <Text style={s.val}>{item.timeCategory}</Text>
                      </View>
                    )}
                  </View>
                  {item.examInfluence && (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={s.label}>Влияние на экзамен</Text>
                      <Text style={[s.val, { fontWeight: 400, color: '#3b3e40' }]}>{item.examInfluence}</Text>
                    </View>
                  )}
                  <View style={s.recBox}>
                    <Text style={s.recLabel}>Рекомендация эксперта</Text>
                    <Text style={s.recText}>{item.recommendation}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 5. Анализ стратегии ── */}
        {a.strategyAnalysis && (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Анализ стратегии прохождения</Text>
            <View style={s.textBox}>
              <Text style={s.textBoxTxt}>{a.strategyAnalysis}</Text>
            </View>
          </View>
        )}

        {/* ── 6. Тип мышления + Потенциал роста ── */}
        {(a.thinkingType || a.growthPotential) && (
          <View style={[s.section, s.row2]} wrap={false}>
            {a.thinkingType && (
              <View style={s.col2}>
                <Text style={s.sTitle}>Тип мышления</Text>
                <View style={s.textBox}>
                  <Text style={s.textBoxTxt}>{a.thinkingType}</Text>
                </View>
              </View>
            )}
            {a.growthPotential && (
              <View style={s.col2}>
                <Text style={s.sTitle}>Потенциал роста</Text>
                <View style={s.textBoxGreen}>
                  <Text style={s.textBoxTxt}>{a.growthPotential}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── 7. Приоритетные направления ── */}
        {a.priorityDirections?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Приоритетные направления подготовки</Text>
            {a.priorityDirections.map((item: any, i: number) => (
              <View key={i} style={s.priorityItem} wrap={false}>
                <View style={s.priorityDot}><Text style={s.priorityDotTxt}>{item.priority}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.priorityDir}>{item.direction}</Text>
                  <Text style={s.priorityJust}>{item.justification}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 8. Стратегический план ── */}
        {a.strategicDevelopment && (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Стратегический план развития</Text>
            <View style={s.devBox}>
              <Text style={s.devPointA}>{a.strategicDevelopment.pointA}</Text>
              {a.strategicDevelopment.stages?.map((stage: any, i: number) => (
                <View key={i} style={s.stageRow}>
                  <View style={s.stageDot}><Text style={s.stageDotTxt}>{i + 1}</Text></View>
                  <View style={s.stageRight}>
                    <View style={s.stageHeader}>
                      <Text style={s.stageName}>{stage.name}</Text>
                      <Text style={s.stagePeriod}>{stage.period}</Text>
                    </View>
                    <Text style={s.stageContent}>{stage.content}</Text>
                  </View>
                </View>
              ))}
              <View style={s.goalBox}>
                <Text style={s.goalLabel}>Целевой ориентир</Text>
                <Text style={s.goalText}>{a.strategicDevelopment.pointB}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── 9. Шансы на поступление ── */}
        {a.admissionChances?.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Шансы на поступление</Text>
            <View style={s.chancesRow}>
              {a.admissionChances.map((item: any, i: number) => {
                const isNoPrep = item.package === 'Без подготовки';
                const isVip = item.package.includes('VIP');
                return (
                  <View key={i} style={[s.chanceCard, isNoPrep ? s.cnNoPrep : isVip ? s.cnVip : s.cnGold]}>
                    <Text style={s.chanceLabel}>{item.package}</Text>
                    <Text style={[s.chanceVal, isNoPrep ? s.cvNoPrep : isVip ? s.cvVip : s.cvGold]}>
                      {item.rangeMin}–{item.rangeMax}%
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={[s.footerTxt, { marginTop: 5 }]}>Вероятностная оценка на основе текущего уровня подготовки.</Text>
          </View>
        )}

        {/* ── 10. Заключение ── */}
        {a.conclusion && (
          <View style={s.section} wrap={false}>
            <Text style={s.sTitle}>Заключение</Text>
            <View style={s.conclusionBox}>
              <Text style={s.conclusionText}>{a.conclusion}</Text>
            </View>
          </View>
        )}

        {/* ── 11. Поведенческий анализ ── */}
        {a.antiCheatBehaviorAnalysis && (
          <View style={s.section} wrap={false}>
            <Text style={[s.sTitle, { color: RED }]}>Поведенческий анализ (прокторинг)</Text>
            <View style={s.antiCheatBox}>
              <Text style={s.antiCheatText}>{a.antiCheatBehaviorAnalysis}</Text>
            </View>
          </View>
        )}

        {/* ── Подвал ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>go2study — Аналитический отчёт · {result.student_name}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
