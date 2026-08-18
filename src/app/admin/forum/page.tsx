'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getForumRegistrations, toggleForumCheckin, toggleForumPaid, deleteForumRegistration, resendForumConfirmation } from '@/app/lib/actions';
import { FORUM_EVENT } from '@/app/forum/event';
import {
  Users, UserCheck, Gift, Loader2, Copy, Check, Download, Search,
  CalendarDays, RefreshCw, Send, CreditCard, Trash2,
} from 'lucide-react';

export default function ForumAdminPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const rows = await getForumRegistrations();
    rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    setList(rows);
    setLoading(false);
  };
  useEffect(() => { setOrigin(window.location.origin); load(); }, []);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    list.forEach(r => { m[r.id] = r.parent_name; });
    return m;
  }, [list]);

  const invitedCount = useMemo(() => {
    const m: Record<string, number> = {};
    list.forEach(r => { if (r.referred_by) m[r.referred_by] = (m[r.referred_by] || 0) + 1; });
    return m;
  }, [list]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(r =>
      (r.parent_name || '').toLowerCase().includes(s) ||
      (r.child_name || '').toLowerCase().includes(s) ||
      (r.parent_whatsapp || '').includes(s));
  }, [list, q]);

  const stats = useMemo(() => ({
    regs: list.length,
    people: list.reduce((s, r) => s + (r.total_people || 0), 0),
    checkedIn: list.filter(r => r.checked_in).length,
    viaInvite: list.filter(r => r.referred_by).length,
    paid: list.filter(r => r.paid).length,
  }), [list]);

  const formUrl = `${origin}/forum`;

  const copyLink = () => { navigator.clipboard.writeText(formUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadQr = () => {
    const c = document.getElementById('forum-form-qr') as HTMLCanvasElement | null;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'forum-qr.png';
    a.click();
  };
  const onCheckin = async (id: string, v: boolean) => {
    setList(l => l.map(r => r.id === id ? { ...r, checked_in: v } : r));
    await toggleForumCheckin(id, v);
  };
  const onPaid = async (id: string, v: boolean) => {
    setList(l => l.map(r => r.id === id ? { ...r, paid: v } : r));
    await toggleForumPaid(id, v);
  };
  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить запись «${name}» из списка? Действие необратимо.`)) return;
    setList(l => l.filter(r => r.id !== id));
    await deleteForumRegistration(id);
  };
  const onResend = async (id: string) => {
    setBusy(id);
    const r = await resendForumConfirmation(id);
    setBusy(null);
    alert(r?.ok ? 'Подтверждение отправлено в WhatsApp ✅' : 'Не отправилось: ' + (r?.reason || 'ошибка'));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#14bf96] animate-spin" /></div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#081d3a] p-4 sm:p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Регистрации на форум</h1>
          <p className="text-sm text-[#3b3e40]/60 mt-1 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> {FORUM_EVENT.title} · {FORUM_EVENT.dateLabel}
          </p>
        </div>
        <button onClick={load} className="self-start sm:self-auto text-xs font-bold uppercase tracking-widest text-[#3b3e40]/60 hover:text-[#081d3a] flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Обновить
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat icon={<Users className="w-4 h-4" />} label="Записей" value={stats.regs} />
        <Stat icon={<Users className="w-4 h-4" />} label="Всего человек" value={stats.people} accent />
        <Stat icon={<CreditCard className="w-4 h-4" />} label="Оплатило" value={stats.paid} />
        <Stat icon={<UserCheck className="w-4 h-4" />} label="Отметилось" value={stats.checkedIn} />
        <Stat icon={<Gift className="w-4 h-4" />} label="По приглашениям" value={stats.viaInvite} />
      </div>

      {/* Share QR */}
      <div className="bg-white rounded-2xl border border-[#e3e8ee] shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="p-3 bg-white rounded-xl border border-[#e3e8ee] shrink-0">
          <QRCodeCanvas id="forum-form-qr" value={formUrl} size={130} level="M" />
        </div>
        <div className="flex-1 w-full space-y-2 text-center sm:text-left">
          <p className="font-bold">Ссылка на форму регистрации</p>
          <p className="text-xs text-[#3b3e40]/60">Распечатайте QR или разошлите ссылку — по ней родители записываются на форум.</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
            <button onClick={copyLink} className="px-4 py-2 rounded-xl bg-[#081d3a] text-white text-xs font-bold flex items-center gap-1.5">
              {copied ? <><Check className="w-3.5 h-3.5" /> Скопировано</> : <><Copy className="w-3.5 h-3.5" /> Копировать ссылку</>}
            </button>
            <button onClick={downloadQr} className="px-4 py-2 rounded-xl border border-[#e3e8ee] text-xs font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Скачать QR
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#3b3e40]/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени, ребёнку или телефону"
          className="w-full rounded-xl border border-[#e3e8ee] bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#14bf96]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e3e8ee] shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#f8fafc] text-[10px] font-black uppercase tracking-widest text-[#3b3e40]/50">
              <tr>
                <th className="text-left px-4 py-3">Родитель</th>
                <th className="text-left px-4 py-3">Ребёнок</th>
                <th className="text-left px-4 py-3">Состав</th>
                <th className="text-left px-4 py-3">Пригласил</th>
                <th className="text-center px-4 py-3">Привёл</th>
                <th className="text-center px-4 py-3">Оплата</th>
                <th className="text-center px-4 py-3">WhatsApp</th>
                <th className="text-center px-4 py-3">Отметка</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f6]">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[#3b3e40]/50 italic">Пока никто не записался</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3">
                    <div className="font-bold">{r.parent_name}</div>
                    <div className="text-xs text-[#3b3e40]/50">{r.parent_whatsapp}</div>
                  </td>
                  <td className="px-4 py-3">{r.child_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.has_spouse && <span className="text-[10px] font-bold bg-pink-50 text-pink-600 rounded px-1.5 py-0.5">+супруг</span>}
                      {r.guests_count > 0 && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">+{r.guests_count} гост.</span>}
                      <span className="text-[10px] font-bold bg-[#f0f9f7] text-[#0d7a63] rounded px-1.5 py-0.5">итого {r.total_people}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.referred_by
                      ? <span className="text-[#0d7a63] font-semibold">{nameById[r.referred_by] || 'приглашение'}</span>
                      : <span className="text-[#3b3e40]/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">
                    {invitedCount[r.id] ? <span className="text-[#14bf96]">{invitedCount[r.id]}</span> : <span className="text-[#3b3e40]/30">0</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onPaid(r.id, !r.paid)}
                      className={`text-xs font-bold rounded-full px-3 py-1.5 ${r.paid ? 'bg-[#14bf96] text-white' : 'bg-[#f0f4f8] text-[#3b3e40]/60'}`}>
                      {r.paid ? 'Оплачено ✓' : 'Отметить'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onResend(r.id)} disabled={busy === r.id}
                      className="text-xs font-bold text-[#081d3a] hover:text-[#14bf96] inline-flex items-center gap-1">
                      {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {r.wa_sent ? 'Отправить снова' : 'Отправить'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onCheckin(r.id, !r.checked_in)}
                      className={`text-xs font-bold rounded-full px-3 py-1.5 ${r.checked_in ? 'bg-[#14bf96] text-white' : 'bg-[#f0f4f8] text-[#3b3e40]/60'}`}>
                      {r.checked_in ? 'Пришёл ✓' : 'Отметить'}
                    </button>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => onDelete(r.id, r.parent_name)} title="Удалить запись"
                      className="text-[#3b3e40]/30 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-[#081d3a] text-white border-[#081d3a]' : 'bg-white border-[#e3e8ee]'}`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent ? 'text-white/60' : 'text-[#3b3e40]/50'}`}>
        {icon} {label}
      </div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${accent ? 'text-white' : 'text-[#081d3a]'}`}>{value}</div>
    </div>
  );
}
