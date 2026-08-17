'use client';

import React, { useEffect, useState, use } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getForumRegistration } from '@/app/lib/actions';
import { FORUM_EVENT } from '../../event';
import {
  CheckCircle2, CalendarDays, Clock, MapPin, Users, Baby, Heart, User,
  Loader2, AlertCircle, Gift, Copy, Check, QrCode,
} from 'lucide-react';

export default function ForumTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reg, setReg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      try {
        const r = await getForumRegistration(id);
        setReg(r);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6E9F7] to-[#eef3fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2747E0] animate-spin" />
      </div>
    );
  }
  if (!reg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6E9F7] to-[#eef3fb] flex items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="w-12 h-12 text-[#16205C]/40 mx-auto mb-3" />
          <p className="text-lg font-bold text-[#16205C]">Билет не найден</p>
          <p className="text-sm text-[#3b3e40]/70 mt-1">Проверьте ссылку или запишитесь заново.</p>
        </div>
      </div>
    );
  }

  const ticketUrl = `${origin}/forum/ticket/${id}`;
  const inviteUrl = `${origin}/forum?ref=${id}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6E9F7] via-white to-[#eef3fb] text-[#16205C]">
      <div className="max-w-lg mx-auto px-4 sm:px-5 py-8 sm:py-12 space-y-5">

        {/* Success */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2747E0] to-[#1E3AC4] flex items-center justify-center mx-auto shadow-lg shadow-[#2747E0]/25">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Вы записаны!</h1>
            <p className="text-sm text-[#3b3e40]/70 mt-1">{reg.parent_name}, ждём вас на форуме go2study.</p>
          </div>
        </div>

        {/* Ticket */}
        <div className="bg-white rounded-3xl shadow-xl shadow-[#16205C]/5 border border-[#16205C]/5 overflow-hidden">
          <div className="bg-[#16205C] text-white p-6">
            <p className="text-[#8AA2F5] font-black uppercase tracking-widest text-[10px] mb-1">Электронный билет</p>
            <h2 className="text-lg font-bold leading-tight">{FORUM_EVENT.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs font-semibold text-white/80">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#8AA2F5]" /> {FORUM_EVENT.dateLabel}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8AA2F5]" /> {FORUM_EVENT.time}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#8AA2F5]" /> {FORUM_EVENT.place}</span>
            </div>
          </div>

          {/* QR */}
          <div className="p-6 flex flex-col items-center gap-3 border-b border-dashed border-[#e3e8ee]">
            <div className="p-3 bg-white rounded-2xl border border-[#e3e8ee]">
              <QRCodeCanvas value={ticketUrl} size={180} level="M" />
            </div>
            <p className="text-xs font-semibold text-[#3b3e40]/60 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> Покажите этот QR на входе
            </p>
          </div>

          {/* Party */}
          <div className="p-6 space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#3b3e40]/40">Кто придёт</p>
            <Row icon={<User className="w-4 h-4 text-[#2747E0]" />} text={reg.parent_name} tag="вы" />
            <Row icon={<Baby className="w-4 h-4 text-[#2747E0]" />} text={reg.child_name} tag="ребёнок" />
            {reg.has_spouse && <Row icon={<Heart className="w-4 h-4 text-[#2747E0]" />} text="Супруг(-а)" />}
            {reg.guests_count > 0 && <Row icon={<Users className="w-4 h-4 text-[#2747E0]" />} text={`Гости: ${reg.guests_count} чел.`} />}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#eef2f6]">
              <span className="text-sm font-bold">Всего</span>
              <span className="text-lg font-bold text-[#2747E0] tabular-nums">{reg.total_people} чел.</span>
            </div>
          </div>
        </div>

        {/* Invite a friend */}
        <div className="bg-white rounded-3xl shadow-lg shadow-[#16205C]/5 border border-[#2747E0]/20 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6E9F7] flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-[#2747E0]" />
            </div>
            <div>
              <h3 className="font-bold">Пригласите семью — бесплатно</h3>
              <p className="text-xs text-[#3b3e40]/70 mt-0.5">Отправьте эту ссылку одной семье, которую хотите позвать на форум.</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-2xl border border-[#e3e8ee]">
              <QRCodeCanvas value={inviteUrl} size={140} level="M" />
            </div>
            <div className="w-full flex items-center gap-2">
              <input readOnly value={inviteUrl}
                className="flex-1 min-w-0 rounded-xl border border-[#e3e8ee] bg-[#f8fafc] px-3 py-2.5 text-xs text-[#3b3e40] truncate" />
              <button onClick={copyInvite}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-[#16205C] hover:bg-[#0a2547] text-white text-xs font-bold flex items-center gap-1.5">
                {copied ? <><Check className="w-3.5 h-3.5" /> Скопировано</> : <><Copy className="w-3.5 h-3.5" /> Копировать</>}
              </button>
            </div>
          </div>

          {reg.invited_count > 0 && (
            <p className="text-center text-sm font-semibold text-[#1E3AC4] bg-[#E6E9F7] rounded-xl py-2">
              🎉 По вашему приглашению уже записалось: {reg.invited_count}
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-[#3b3e40]/40 pt-2">go2study · увидимся на форуме</p>
      </div>
    </div>
  );
}

function Row({ icon, text, tag }: { icon: React.ReactNode; text: string; tag?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#E6E9F7] flex items-center justify-center shrink-0">{icon}</div>
      <span className="text-sm font-semibold flex-1">{text}</span>
      {tag && <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b3e40]/40">{tag}</span>}
    </div>
  );
}
