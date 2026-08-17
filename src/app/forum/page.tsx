'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerForum } from '@/app/lib/actions';
import { FORUM_EVENT } from './event';
import {
  Sparkles, CalendarDays, Clock, MapPin, Users, User, Baby, Heart,
  Minus, Plus, Loader2, CheckCircle2, Gift,
} from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f7] via-white to-[#eef3fb] text-[#081d3a]">
      <div className="max-w-lg mx-auto px-4 sm:px-5 py-8 sm:py-12 space-y-5">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 text-[#14bf96] font-bold text-xs uppercase tracking-[0.25em]">
          <Sparkles className="w-3.5 h-3.5" /> go2study <Sparkles className="w-3.5 h-3.5" />
        </div>

        {/* Event hero */}
        <div className="bg-[#081d3a] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#081d3a]/10">
          <p className="text-[#14bf96] font-black uppercase tracking-widest text-[11px] mb-2">Форум для родителей</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{FORUM_EVENT.title}</h1>
          <p className="text-white/70 mt-2 text-sm leading-relaxed">{FORUM_EVENT.subtitle}</p>

          <div className="flex flex-wrap gap-2 mt-5">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5 text-[#14bf96]" /> {FORUM_EVENT.dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#14bf96]" /> {FORUM_EVENT.time}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#14bf96]" /> {FORUM_EVENT.place}
            </span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed mt-4">{FORUM_EVENT.description}</p>
          {FORUM_EVENT.note && (
            <p className="text-[#14bf96] text-xs font-semibold mt-3">{FORUM_EVENT.note}</p>
          )}
        </div>

        {ref && (
          <div className="bg-[#f0f9f7] border border-[#14bf96]/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-[#0d7a63] font-semibold">
            <Gift className="w-4 h-4 shrink-0" /> Вы регистрируетесь по личному приглашению — добро пожаловать!
          </div>
        )}

        {/* Registration form */}
        <div className="bg-white rounded-3xl shadow-lg shadow-[#081d3a]/5 border border-[#081d3a]/5 p-6 sm:p-7 space-y-5">
          <h2 className="font-bold text-lg">Регистрация</h2>

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
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${hasSpouse ? 'bg-[#14bf96]' : 'bg-[#d5dce4]'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${hasSpouse ? 'translate-x-5' : ''}`} />
            </span>
          </button>

          {/* Guests */}
          <div className="rounded-2xl border-2 border-[#e3e8ee] px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <Users className="w-4 h-4 text-[#3b3e40]/50" />
                Знакомые / доп. гости
              </span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setGuests(g => Math.max(0, g - 1))}
                  className="w-8 h-8 rounded-full border border-[#e3e8ee] flex items-center justify-center text-[#081d3a] disabled:opacity-30"
                  disabled={guests === 0}><Minus className="w-4 h-4" /></button>
                <span className="w-6 text-center font-bold tabular-nums">{guests}</span>
                <button type="button" onClick={() => setGuests(g => Math.min(20, g + 1))}
                  className="w-8 h-8 rounded-full border border-[#e3e8ee] flex items-center justify-center text-[#081d3a]"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-[11px] text-[#3b3e40]/50 mt-1.5">Если приведёте друзей или родственников — укажите, сколько их</p>
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

        <p className="text-center text-[11px] text-[#3b3e40]/40 pt-2">go2study · подготовка к НИШ, БИЛ, РФМШ</p>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-[#e3e8ee] bg-[#f8fafc] px-4 py-3 text-sm font-medium outline-none focus:border-[#14bf96] focus:bg-white transition-colors';

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
