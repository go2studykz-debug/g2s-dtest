'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerForum } from '@/app/lib/actions';
import { FORUM_EVENT } from './event';
import {
  Sparkles, CalendarDays, Clock, MapPin, Users, User, Baby, Heart,
  Minus, Plus, Loader2, CheckCircle2, Gift, ArrowRight,
  ClipboardCheck, AlertTriangle, Route, MessagesSquare, ShieldCheck,
} from 'lucide-react';

const BENEFIT_ICONS = [ClipboardCheck, AlertTriangle, Route, MessagesSquare];

export default function ForumRegistrationPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);

  const [parentName, setParentName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [childName, setChildName] = useState('');
  const [hasSpouse, setHasSpouse] = useState(false);
  const [guests, setGuests] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r) setRef(r);
  }, []);

  const total = 1 + 1 + (hasSpouse ? 1 : 0) + guests; // родитель + ребёнок + супруг + гости

  const submit = async () => {
    setError('');
    if (!parentName.trim()) return setError('Укажите ваше имя');
    if (whatsapp.replace(/\D/g, '').length < 10) return setError('Проверьте номер WhatsApp');
    if (!childName.trim()) return setError('Укажите имя ребёнка — присутствие ребёнка обязательно');
    setSubmitting(true);
    try {
      const res = await registerForum({
        parentName, parentWhatsapp: whatsapp, childName,
        hasSpouse, guestsCount: guests, referredBy: ref,
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
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9f7] via-white to-[#eef3fb] text-[#081d3a]">
      {/* Nav */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[#14bf96] font-black text-sm uppercase tracking-[0.2em]">
          <Sparkles className="w-4 h-4" /> go2study
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#14bf96]/10 text-[#0d7a63] rounded-full px-3 py-1.5 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Участие бесплатное
        </span>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Pitch */}
        <div className="space-y-6 lg:pt-6">
          <p className="inline-flex items-center gap-2 bg-white border border-[#14bf96]/25 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#0d7a63]">
            <Sparkles className="w-3.5 h-3.5" /> Форум для родителей
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight">
            {FORUM_EVENT.title}
          </h1>
          <p className="text-base sm:text-lg text-[#3b3e40]/80 leading-relaxed max-w-xl">
            {FORUM_EVENT.subtitle}
          </p>

          {/* Event meta */}
          <div className="flex flex-wrap gap-2.5">
            <MetaChip icon={<CalendarDays className="w-4 h-4 text-[#14bf96]" />} text={FORUM_EVENT.dateLabel} />
            <MetaChip icon={<Clock className="w-4 h-4 text-[#14bf96]" />} text={FORUM_EVENT.time} />
            <MetaChip icon={<MapPin className="w-4 h-4 text-[#14bf96]" />} text={FORUM_EVENT.place} />
          </div>

          {/* Quick benefits */}
          <ul className="space-y-2.5 pt-1">
            {FORUM_EVENT.benefits.slice(0, 3).map((b) => (
              <li key={b.title} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#14bf96] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">{b.title}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={scrollToForm}
              className="lg:hidden inline-flex items-center gap-2 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold px-6 py-3.5 rounded-2xl transition-colors">
              Записаться <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[#0d7a63] text-sm font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> {FORUM_EVENT.note}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div id="reg" className="lg:sticky lg:top-6 scroll-mt-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-[#081d3a]/8 border border-[#081d3a]/5 overflow-hidden">
            <div className="bg-[#081d3a] text-white px-6 sm:px-7 py-5">
              <h2 className="font-bold text-lg">Регистрация на форум</h2>
              <p className="text-white/60 text-xs mt-0.5">Займёт меньше минуты — билет придёт в WhatsApp</p>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {ref && (
                <div className="bg-[#f0f9f7] border border-[#14bf96]/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-[#0d7a63] font-semibold">
                  <Gift className="w-4 h-4 shrink-0" /> Вы пришли по личному приглашению — добро пожаловать!
                </div>
              )}

              <Field label="Ваше имя" icon={<User className="w-4 h-4" />}>
                <input value={parentName} onChange={e => setParentName(e.target.value)}
                  placeholder="Как к вам обращаться" className={inputCls} />
              </Field>

              <Field label="WhatsApp" icon={<span className="text-[#14bf96] text-sm">✆</span>} hint="Пришлём подтверждение и билет">
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} inputMode="tel"
                  placeholder="+7 700 000 00 00" className={inputCls} />
              </Field>

              <Field label="Имя ребёнка" icon={<Baby className="w-4 h-4" />} hint="Присутствие ребёнка обязательно">
                <input value={childName} onChange={e => setChildName(e.target.value)}
                  placeholder="Имя и фамилия ребёнка" className={inputCls} />
              </Field>

              {/* Spouse */}
              <button type="button" onClick={() => setHasSpouse(v => !v)}
                className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 transition-colors ${hasSpouse ? 'border-[#14bf96] bg-[#f0f9f7]' : 'border-[#e3e8ee] bg-white'}`}>
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Heart className={`w-4 h-4 ${hasSpouse ? 'text-[#14bf96]' : 'text-[#3b3e40]/40'}`} />
                  Приду с супругом(-ой)
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b3e40]/40">желательно</span>
                </span>
                <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${hasSpouse ? 'bg-[#14bf96]' : 'bg-[#d5dce4]'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${hasSpouse ? 'translate-x-5' : ''}`} />
                </span>
              </button>

              {/* Guests */}
              <div className="rounded-2xl border-2 border-[#e3e8ee] px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <Users className="w-4 h-4 text-[#3b3e40]/50" /> Знакомые / доп. гости
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" onClick={() => setGuests(g => Math.max(0, g - 1))}
                      className="w-8 h-8 rounded-full border border-[#e3e8ee] flex items-center justify-center disabled:opacity-30"
                      disabled={guests === 0}><Minus className="w-4 h-4" /></button>
                    <span className="w-6 text-center font-bold tabular-nums">{guests}</span>
                    <button type="button" onClick={() => setGuests(g => Math.min(20, g + 1))}
                      className="w-8 h-8 rounded-full border border-[#e3e8ee] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-[11px] text-[#3b3e40]/50 mt-1.5">Приведёте друзей или родственников — укажите, сколько</p>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-[#081d3a] text-white rounded-2xl px-4 py-3">
                <span className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#14bf96]" /> Всего придёт</span>
                <span className="text-xl font-bold tabular-nums">{total} чел.</span>
              </div>

              {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <button onClick={submit} disabled={submitting}
                className="w-full py-4 rounded-2xl bg-[#14bf96] hover:bg-[#11a381] disabled:opacity-60 text-white font-bold text-base transition-colors flex items-center justify-center gap-2">
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
          <p className="text-[11px] font-black uppercase tracking-widest text-[#14bf96]">Программа</p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Что будет на форуме</h2>
          <p className="text-sm text-[#3b3e40]/70 mt-2 leading-relaxed">{FORUM_EVENT.description}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FORUM_EVENT.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <div key={b.title} className="bg-white rounded-2xl border border-[#081d3a]/5 shadow-sm p-6 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#f0f9f7] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#14bf96]" />
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

      {/* Who to bring */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-[#081d3a] text-white rounded-3xl p-7 sm:p-10 shadow-xl shadow-[#081d3a]/10">
          <div className="text-center max-w-xl mx-auto mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold">Приходите всей семьёй</h2>
            <p className="text-white/60 text-sm mt-2">Форум полезнее, когда решение о подготовке принимается вместе.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <AudienceCard icon={<Baby className="w-5 h-5" />} title="Ребёнок" tag="обязательно"
              text="Главный участник — на форуме говорим в том числе о его сильных сторонах." highlight />
            <AudienceCard icon={<Heart className="w-5 h-5" />} title="Супруг(-а)" tag="желательно"
              text="Чтобы вся семья была на одной волне по подготовке и целям." />
            <AudienceCard icon={<Users className="w-5 h-5" />} title="Знакомые" tag="можно"
              text="Приведите друзей, чьим детям тоже предстоит поступление." />
          </div>
          <div className="text-center mt-8">
            <button onClick={scrollToForm}
              className="inline-flex items-center gap-2 bg-[#14bf96] hover:bg-[#11a381] text-white font-bold px-7 py-3.5 rounded-2xl transition-colors">
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

const inputCls = 'w-full rounded-xl border border-[#e3e8ee] bg-[#f8fafc] px-4 py-3 text-sm font-medium outline-none focus:border-[#14bf96] focus:bg-white transition-colors';

function MetaChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white border border-[#e3e8ee] rounded-full px-3.5 py-2 text-xs font-bold">
      {icon} {text}
    </span>
  );
}

function AudienceCard({ icon, title, tag, text, highlight }: { icon: React.ReactNode; title: string; tag: string; text: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${highlight ? 'bg-[#14bf96]/15 border border-[#14bf96]/30' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[#14bf96]">{icon}</div>
        <div>
          <p className="font-bold leading-none">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#14bf96] mt-1">{tag}</p>
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
