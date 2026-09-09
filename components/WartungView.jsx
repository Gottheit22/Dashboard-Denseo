'use client';
import React, { useState, useMemo } from 'react';
import { X, Search, AlertTriangle, CalendarClock, ListChecks, ChevronRight } from 'lucide-react';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d - now) / 86400000);
}
function isSameMonth(iso) {
  if (!iso) return false;
  const now = new Date();
  const d = new Date(iso + 'T00:00:00');
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function WartungView({ items }) {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [search, setSearch] = useState('');

  const withDate = items.filter(i => i.naechsteWartung);

  const overdue = withDate
    .filter(i => daysUntil(i.naechsteWartung) < 0)
    .sort((a, b) => a.naechsteWartung.localeCompare(b.naechsteWartung));

  const dueThisMonth = withDate
    .filter(i => isSameMonth(i.naechsteWartung) && daysUntil(i.naechsteWartung) >= 0)
    .sort((a, b) => a.naechsteWartung.localeCompare(b.naechsteWartung));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      [i.kunde, i.modell, i.seriennummer, i.kundenId, i.notiz].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div>
      <div>
        <h1 className="text-[19px] font-semibold text-[#1C2530] tracking-tight">Wartung</h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">Gerätebestand, überfällige und anstehende Wartungen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-[#E2E5E0] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#C1553A]" />
            <span className="text-[13px] font-medium text-[#1C2530]">Überfällige Wartungen</span>
            <span className="text-[11px] text-[#C1553A] bg-[#FBE9E6] px-1.5 py-0.5 rounded ml-auto">{overdue.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto">
            {overdue.length === 0 && <div className="text-[12px] text-[#B0B7BD] py-3 text-center">Keine überfälligen Wartungen</div>}
            {overdue.map(i => (
              <div key={i.id} className="border border-[#F3DAD3] bg-[#FBF3F1] rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1C2530] truncate">{i.kunde}</span>
                  <span className="text-[11px] text-[#C1553A] font-medium shrink-0 ml-2">{Math.abs(daysUntil(i.naechsteWartung))} Tage</span>
                </div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5">{i.modell}{i.seriennummer ? ` · ${i.seriennummer}` : ''} · fällig {fmtDate(i.naechsteWartung)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E5E0] p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-[#2B6E63]" />
            <span className="text-[13px] font-medium text-[#1C2530]">Diesen Monat fällig</span>
            <span className="text-[11px] text-[#2B6E63] bg-[#E8F1EF] px-1.5 py-0.5 rounded ml-auto">{dueThisMonth.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto">
            {dueThisMonth.length === 0 && <div className="text-[12px] text-[#B0B7BD] py-3 text-center">Keine Wartungen diesen Monat</div>}
            {dueThisMonth.map(i => (
              <div key={i.id} className="border border-[#E2E5E0] bg-[#F7F8F6] rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1C2530] truncate">{i.kunde}</span>
                  <span className="text-[11px] text-[#8B95A1] shrink-0 ml-2">{fmtDate(i.naechsteWartung)}</span>
                </div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5">{i.modell}{i.seriennummer ? ` · ${i.seriennummer}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOverviewOpen(true)}
        className="w-full mt-4 bg-white rounded-xl border border-[#E2E5E0] p-4 flex items-center gap-3 hover:border-[#C9CFC7] text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-[#EEF0EC] flex items-center justify-center shrink-0">
          <ListChecks className="w-4 h-4 text-[#5B6570]" />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-[#1C2530]">Wartungsübersicht</div>
          <div className="text-[12px] text-[#8B95A1]">Alle {items.length} Geräte aus der Wartungsliste ansehen</div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#9AA3AC]" />
      </button>

      {overviewOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setOverviewOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5E0]">
              <span className="text-[14px] font-semibold text-[#1C2530]">Wartungsübersicht</span>
              <button onClick={() => setOverviewOpen(false)} className="text-[#9AA3AC] hover:text-[#1C2530]"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-3 border-b border-[#E2E5E0]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9AA3AC] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Kunde, Modell, Seriennummer suchen …"
                  className="w-full border border-[#DCE0DA] rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-[#8B95A1] border-b border-[#E2E5E0]">
                    <th className="px-5 py-2 font-medium">Kunde</th>
                    <th className="px-3 py-2 font-medium">Modell</th>
                    <th className="px-3 py-2 font-medium">Seriennummer</th>
                    <th className="px-3 py-2 font-medium">Installation</th>
                    <th className="px-3 py-2 font-medium">Letzte Wartung</th>
                    <th className="px-3 py-2 font-medium">Nächste Wartung</th>
                    <th className="px-5 py-2 font-medium">Notiz</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => {
                    const d = daysUntil(i.naechsteWartung);
                    const overdue = d !== null && d < 0;
                    return (
                      <tr key={i.id} className="border-b border-[#F0F1EE] hover:bg-[#F7F8F6]">
                        <td className="px-5 py-2 text-[#1C2530] font-medium">{i.kunde}</td>
                        <td className="px-3 py-2 text-[#5B6570]">{i.modell || '—'}</td>
                        <td className="px-3 py-2 text-[#5B6570]">{i.seriennummer || '—'}</td>
                        <td className="px-3 py-2 text-[#5B6570]">{fmtDate(i.installation)}</td>
                        <td className="px-3 py-2 text-[#5B6570]">{fmtDate(i.letzteWartung)}</td>
                        <td className={`px-3 py-2 font-medium ${overdue ? 'text-[#C1553A]' : 'text-[#1C2530]'}`}>{fmtDate(i.naechsteWartung)}</td>
                        <td className="px-5 py-2 text-[#8B95A1]">{i.notiz || ''}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-6 text-center text-[#B0B7BD]">Keine Treffer</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
