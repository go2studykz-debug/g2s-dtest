'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerForum } from '@/app/lib/actions';
import { FORUM_EVENT } from './event';
import {
  CalendarDays, Clock, MapPin, Users, User, Phone, GraduationCap, UserPlus,
  Loader2, CheckCircle2, ArrowRight,
  ClipboardCheck, BarChart3, Presentation, CalendarRange, MessagesSquare, ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const BENEFIT_ICONS = [ClipboardCheck, BarChart3, Presentation, CalendarRange, MessagesSquare];

export default function ForumRegistrationPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);

  const [parentName, setParentName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [childName, setChildName] = useState('');
  const [hasSpouse, setHasSpouse] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r) setRef(r);
  }, []);

  const total = 1 + 1 + (hasSpouse ? 1 : 0); // родитель + ребёнок + (супруг)

  // Форматирование номера как на тест-сайте: +7 7XX XXX XX XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const isDeleting = input.length < whatsapp.length;
    if (!input) { setWhatsapp(''); return; }
    let digits = input.replace(/\D/g, '');
    if (!isDeleting) {
      if (digits.startsWith('8')) digits = '7' + digits.substring(1);
      if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
    }
    digits = digits.substring(0, 11);
    let formatted = '';
    if (digits.length > 0) {
      formatted += '+7';
      if (digits.length > 1) {
        const rest = digits.substring(1);
        if (rest.length > 0) formatted += ' ' + rest.substring(0, 3);
        if (rest.length > 3) formatted += ' ' + rest.substring(3, 6);
        if (rest.length > 6) formatted += ' ' + rest.substring(6, 8);
        if (rest.length > 8) formatted += ' ' + rest.substring(8, 10);
      }
    }
    setWhatsapp(formatted);
  };

  const submit = async () => {
    setError('');
    if (!parentName.trim()) return setError('Укажите ваше имя');
    if (whatsapp.replace(/\D/g, '').length < 10) return setError('Проверьте номер WhatsApp');
    if (!childName.trim()) return setError('Укажите имя ребёнка — присутствие ребёнка обязательно');
    setSubmitting(true);
    try {
      const res = await registerForum({
        parentName, parentWhatsapp: whatsapp, childName,
        hasSpouse, guestsCount: 0, referredBy: ref,
      });
      if (!res.ok) { setError(res.reason || 'Не удалось записаться, попробуйте ещё раз'); setSubmitting(false); return; }
      router.push(`/forum/ticket/${res.id}`);
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
      setSubmitting(false);
    }
  };

  const scrollToForm = () => document.getElementById('reg')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6E9F7] via-white to-[#eef3fb] text-[#16205C]">
      {/* Nav */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wordmark-transparent.png" alt="go2study" className="h-6 sm:h-7 w-auto" />
        <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#2747E0]/10 text-[#1E3AC4] rounded-full px-3 py-1.5 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Участие бесплатное
        </span>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Pitch */}
        <div className="space-y-6 lg:pt-6">
          <p className="inline-flex items-center gap-2 bg-white border border-[#2747E0]/25 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#1E3AC4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2747E0]" /> Форум для родителей
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight">
            {FORUM_EVENT.title}
          </h1>
          <p className="text-base sm:text-lg text-[#3b3e40]/80 leading-relaxed max-w-xl">
            {FORUM_EVENT.subtitle}
          </p>

          {/* Event meta */}
          <div className="flex flex-wrap gap-2.5">
            <MetaChip icon={<CalendarDays className="w-4 h-4 text-[#2747E0]" />} text={FORUM_EVENT.dateLabel} />
            {FORUM_EVENT.time && <MetaChip icon={<Clock className="w-4 h-4 text-[#2747E0]" />} text={FORUM_EVENT.time} />}
            <MetaChip icon={<MapPin className="w-4 h-4 text-[#2747E0]" />} text={FORUM_EVENT.place} />
          </div>

          {/* Quick benefits */}
          <ul className="space-y-2.5 pt-1">
            {FORUM_EVENT.benefits.slice(0, 3).map((b) => (
              <li key={b.title} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#2747E0] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">{b.title}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={scrollToForm}
              className="lg:hidden inline-flex items-center gap-2 bg-[#2747E0] hover:bg-[#1E3AC4] text-white font-bold px-6 py-3.5 rounded-2xl transition-colors">
              Записаться <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[#1E3AC4] text-sm font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> {FORUM_EVENT.note}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div id="reg" className="lg:sticky lg:top-6 scroll-mt-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-[#16205C]/8 border border-[#16205C]/5 overflow-hidden">
            <div className="bg-[#16205C] text-white px-6 sm:px-7 py-5">
              <h2 className="font-bold text-lg">Регистрация на форум</h2>
              <p className="text-white/60 text-xs mt-0.5">Займёт меньше минуты — билет придёт в WhatsApp</p>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {ref && (
                <div className="bg-[#E6E9F7] border border-[#2747E0]/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-[#1E3AC4] font-semibold">
                  <UserPlus className="w-4 h-4 shrink-0" /> Вы пришли по личному приглашению — добро пожаловать!
                </div>
              )}

              <Field label="Ваше имя" icon={<User className="w-4 h-4" />}>
                <input value={parentName} onChange={e => setParentName(e.target.value)}
                  placeholder="Как к вам обращаться" className={inputCls} />
              </Field>

              <Field label="WhatsApp" icon={<Phone className="w-4 h-4" />} hint="Пришлём подтверждение и билет">
                <input value={whatsapp} onChange={handlePhoneChange} inputMode="tel" maxLength={16}
                  placeholder="+7 7XX XXX XX XX" className={inputCls} />
              </Field>

              <Field label="Имя ребёнка" icon={<GraduationCap className="w-4 h-4" />} hint="Присутствие ребёнка обязательно">
                <input value={childName} onChange={e => setChildName(e.target.value)}
                  placeholder="Имя и фамилия ребёнка" className={inputCls} />
              </Field>

              {/* Spouse */}
              <button type="button" onClick={() => setHasSpouse(v => !v)}
                className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 transition-colors ${hasSpouse ? 'border-[#2747E0] bg-[#E6E9F7]' : 'border-[#e3e8ee] bg-white'}`}>
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Users className={`w-4 h-4 ${hasSpouse ? 'text-[#2747E0]' : 'text-[#3b3e40]/40'}`} />
                  Приду с супругом(-ой)
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b3e40]/40">желательно</span>
                </span>
                <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${hasSpouse ? 'bg-[#2747E0]' : 'bg-[#d5dce4]'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${hasSpouse ? 'translate-x-5' : ''}`} />
                </span>
              </button>

              {/* Приглашение семьи — число не спрашиваем, ссылку даём после записи */}
              <div className="rounded-2xl bg-[#E6E9F7] border border-[#2747E0]/20 px-4 py-3.5 flex items-start gap-2.5">
                <UserPlus className="w-4 h-4 text-[#2747E0] shrink-0 mt-0.5" />
                <p className="text-xs text-[#16205C] font-medium leading-relaxed">
                  После записи вы сможете <b>бесплатно пригласить одну семью</b> — пришлём готовую ссылку, чтобы им отправить.
                </p>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-[#16205C] text-white rounded-2xl px-4 py-3">
                <span className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#6E8BFF]" /> Всего придёт</span>
                <span className="text-xl font-bold tabular-nums">{total} чел.</span>
              </div>

              {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <button onClick={submit} disabled={submitting}
                className="w-full py-4 rounded-2xl bg-[#2747E0] hover:bg-[#1E3AC4] disabled:opacity-60 text-white font-bold text-base transition-colors flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Записываем…</> : <><CheckCircle2 className="w-5 h-5" /> Записаться на форум</>}
              </button>
              <p className="text-center text-[11px] text-[#3b3e40]/45">Нажимая кнопку, вы соглашаетесь на обработку контактных данных для организации мероприятия.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Program */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#2747E0]">Программа</p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Что будет на форуме</h2>
          <p className="text-sm text-[#3b3e40]/70 mt-2 leading-relaxed">{FORUM_EVENT.description}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FORUM_EVENT.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <div key={b.title} className="bg-white rounded-2xl border border-[#16205C]/5 shadow-sm p-6 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#E6E9F7] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#2747E0]" />
                </div>
                <div>
                  <h3 className="font-bold">{b.title}</h3>
                  <p className="text-sm text-[#3b3e40]/70 mt-1 leading-relaxed">{b.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Result preview — что получите на руки */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#2747E0]">Что заберёте с собой</p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Личный бланк результата ребёнка</h2>
          <p className="text-sm text-[#3b3e40]/70 mt-2 leading-relaxed">Не «нормально/плохо», а конкретный балл, сравнение с проходным и список пробелов — что именно подтягивать до экзамена.</p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg shadow-[#16205C]/10 border border-[#16205C]/10 overflow-hidden">
          {/* header */}
          <div className="bg-[#16205C] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><BarChart3 className="w-4 h-4 text-[#6E8BFF]" /></div>
              <div className="leading-tight">
                <div className="font-bold text-sm">Личный бланк результата</div>
                <div className="text-[9px] text-white/50 uppercase tracking-[0.15em]">go2study · диагностика НИШ</div>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#6E8BFF] bg-white/10 rounded-full px-2.5 py-1">пример</span>
          </div>

          {/* score + subjects */}
          <div className="px-5 sm:px-7 py-6 flex flex-col sm:flex-row gap-6 sm:gap-7 border-b border-[#eef1f7]">
            <div className="flex sm:flex-col items-center gap-4 sm:gap-3 sm:w-32 shrink-0">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E6E9F7" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#2747E0" strokeWidth="9" strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset="58" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[#16205C] tabular-nums leading-none">78%</span>
                  <span className="text-[9px] text-[#6A6E78] tabular-nums mt-0.5">312/400</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2747E0] bg-[#E6E9F7] rounded-full px-2 py-1"><TrendingUp className="w-3 h-3" /> +13% к проходному</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#6A6E78] mb-2.5">Баллы по предметам</div>
              <div className="space-y-2.5">
                {[['Математика', '82%', '164/200'], ['Логика', '76%', '38/50'], ['Английский', '70%', '70/100'], ['Казахский', '80%', '40/50']].map(([s, p, sc]) => (
                  <div key={s} className="flex items-center gap-2.5">
                    <span className="w-[74px] text-xs font-semibold text-[#16205C] shrink-0">{s}</span>
                    <div className="flex-1 h-2 rounded-full bg-[#E6E9F7] overflow-hidden"><div className="h-full rounded-full bg-[#2747E0]" style={{ width: p }} /></div>
                    <span className="w-[76px] text-right text-[11px] tabular-nums shrink-0"><b className="text-[#16205C]">{p}</b> <span className="text-[#6A6E78]">{sc}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* benchmark */}
          <div className="px-5 sm:px-7 py-5 border-b border-[#eef1f7]">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#6A6E78] mb-3">Сравнение с группой</div>
            <div className="space-y-2">
              {[['Этот ученик', 78, '#2747E0'], ['Средний по группе', 71, '#6E8BFF'], ['Проходной балл', 65, '#16205C']].map(([l, v, c]) => (
                <div key={l as string} className="flex items-center gap-2.5">
                  <span className="w-[112px] text-[11px] text-[#6A6E78] shrink-0">{l}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#F1F2F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, background: c as string }} /></div>
                  <span className="w-9 text-right text-[11px] font-bold tabular-nums text-[#16205C] shrink-0">{v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* gaps + forecast */}
          <div className="px-5 sm:px-7 py-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#6A6E78] mb-3">Зоны роста · что подтянуть</div>
            <div className="space-y-2.5">
              {[['Преобразование единиц', '4 ошибки', 'таблица коэффициентов + 50 задач'], ['Задачи на движение', '3 ошибки', 'схемы встречного движения, разбор формулы'], ['Понимание текста (англ.)', 'серия из 5', 'чтение по 10–15 минут в день']].map(([t, m, r]) => (
                <div key={t} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2747E0] mt-[7px] shrink-0" />
                  <div className="text-xs leading-snug">
                    <span className="font-bold text-[#16205C]">{t}</span> <span className="text-[#6A6E78]">· {m}</span>
                    <div className="text-[#6A6E78]">→ {r}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 bg-[#E6E9F7] rounded-xl px-3.5 py-2.5">
              <TrendingUp className="w-4 h-4 text-[#2747E0] shrink-0" />
              <span className="text-xs font-semibold text-[#16205C]">Прогноз при системной подготовке: <b className="tabular-nums">78% → 88%</b> к марту.</span>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-[#3b3e40]/45 mt-3">Так выглядит бланк, который вы получаете в конце форума. Цифры — пример.</p>
      </section>

      {/* Who to bring */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-[#16205C] text-white rounded-3xl p-7 sm:p-10 shadow-xl shadow-[#16205C]/10">
          <div className="text-center max-w-xl mx-auto mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold">Приходите всей семьёй</h2>
            <p className="text-white/60 text-sm mt-2">Форум полезнее, когда решение о подготовке принимается вместе.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <AudienceCard icon={<GraduationCap className="w-5 h-5" />} title="Ребёнок" tag="обязательно"
              text="Главный участник — на форуме говорим в том числе о его сильных сторонах." highlight />
            <AudienceCard icon={<Users className="w-5 h-5" />} title="Супруг(-а)" tag="желательно"
              text="Чтобы вся семья была на одной волне по подготовке и целям." />
            <AudienceCard icon={<UserPlus className="w-5 h-5" />} title="Знакомая семья" tag="бесплатно"
              text="После регистрации получите ссылку — позовите одну семью, чьим детям тоже предстоит поступление." />
          </div>
          <div className="text-center mt-8">
            <button onClick={scrollToForm}
              className="inline-flex items-center gap-2 bg-[#2747E0] hover:bg-[#1E3AC4] text-white font-bold px-7 py-3.5 rounded-2xl transition-colors">
              Записаться на форум <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-center">
        <p className="text-[11px] text-[#3b3e40]/40">go2study · подготовка к НИШ, БИЛ, РФМШ</p>
      </footer>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-[#e3e8ee] bg-[#f8fafc] px-4 py-3 text-sm font-medium outline-none focus:border-[#2747E0] focus:bg-white transition-colors';

function MetaChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white border border-[#e3e8ee] rounded-full px-3.5 py-2 text-xs font-bold">
      {icon} {text}
    </span>
  );
}

function AudienceCard({ icon, title, tag, text, highlight }: { icon: React.ReactNode; title: string; tag: string; text: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${highlight ? 'bg-[#2747E0]/15 border border-[#2747E0]/30' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[#6E8BFF]">{icon}</div>
        <div>
          <p className="font-bold leading-none">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E8BFF] mt-1">{tag}</p>
        </div>
      </div>
      <p className="text-xs text-white/60 leading-relaxed">{text}</p>
    </div>
  );
}

function Field({ label, icon, hint, children }: { label: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#3b3e40]/60">
        {icon} {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[#3b3e40]/50">{hint}</p>}
    </div>
  );
}
