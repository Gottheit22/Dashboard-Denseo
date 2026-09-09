'use client';
import React, { useState, useMemo } from 'react';
import { X, Search, AlertTriangle, CalendarClock, ListChecks, ChevronRight, Check } from 'lucide-react';

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
function groupKey(item) {
  return item.kundenId || item.kunde;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function addOneYear(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function WartungView({ items, onUpdateItem }) {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [actionItem, setActionItem] = useState(null); // item that was clicked

  const withDate = items.filter(i => i.naechsteWartung && i.aktiv);
  const monthStart = startOfCurrentMonth();

  // Überfällig: Termin liegt vor dem aktuellen Monat (vergangene Monate)
  const overdue = withDate
    .filter(i => new Date(i.naechsteWartung + 'T00:00:00') < monthStart)
    .sort((a, b) => a.naechsteWartung.localeCompare(b.naechsteWartung));

  // Diesen Monat fällig: Termin liegt im aktuellen Kalendermonat,
  // egal ob er innerhalb des Monats schon verstrichen ist oder noch bevorsteht
  const dueThisMonth = withDate
    .filter(i => isSameMonth(i.naechsteWartung))
    .sort((a, b) => a.naechsteWartung.localeCompare(b.naechsteWartung));

  const filtered = useMemo(() => {
    const base = showInactive ? items : items.filter(i => i.aktiv);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(i =>
      [i.kunde, i.modell, i.seriennummer, i.kundenId, i.notiz].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [items, search, showInactive]);

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
              <button key={i.id} onClick={() => setActionItem(i)} className="w-full text-left border border-[#F3DAD3] bg-[#FBF3F1] rounded-lg px-3 py-2 hover:border-[#E7B8AC]">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1C2530] truncate">{i.kunde}</span>
                  <span className="text-[11px] text-[#C1553A] font-medium shrink-0 ml-2">{Math.abs(daysUntil(i.naechsteWartung))} Tage</span>
                </div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5">{i.modell}{i.seriennummer ? ` · ${i.seriennummer}` : ''} · fällig {fmtDate(i.naechsteWartung)}</div>
              </button>
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
              <button key={i.id} onClick={() => setActionItem(i)} className="w-full text-left border border-[#E2E5E0] bg-[#F7F8F6] rounded-lg px-3 py-2 hover:border-[#C9CFC7]">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1C2530] truncate">{i.kunde}</span>
                  <span className="text-[11px] text-[#8B95A1] shrink-0 ml-2">{fmtDate(i.naechsteWartung)}</span>
                </div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5">{i.modell}{i.seriennummer ? ` · ${i.seriennummer}` : ''}</div>
              </button>
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
          <div className="text-[12px] text-[#8B95A1]">Alle {items.filter(i => i.aktiv).length} aktiven Geräte aus der Wartungsliste ansehen</div>
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
            <div className="px-5 py-3 border-b border-[#E2E5E0] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#9AA3AC] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Kunde, Modell, Seriennummer suchen …"
                  className="w-full border border-[#DCE0DA] rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]"
                />
              </div>
              <label className="flex items-center gap-1.5 text-[12px] text-[#5B6570] shrink-0 select-none cursor-pointer">
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-[#2B6E63]" />
                Archivierte anzeigen
              </label>
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
                      <tr key={i.id} className={`border-b border-[#F0F1EE] hover:bg-[#F7F8F6] ${!i.aktiv ? 'opacity-50' : ''}`}>
                        <td className="px-5 py-2">
                          <button onClick={() => setActionItem(i)} className="text-[#1C2530] font-medium hover:text-[#2B6E63] hover:underline text-left">
                            {i.kunde}
                          </button>
                          {!i.aktiv && (
                            <>
                              <span className="ml-2 text-[10px] text-[#9AA3AC] bg-[#EEF0EC] px-1.5 py-0.5 rounded">archiviert</span>
                              <button
                                onClick={() => onUpdateItem(i.id, { aktiv: true })}
                                className="ml-2 text-[10px] text-[#2B6E63] hover:underline"
                              >
                                reaktivieren
                              </button>
                            </>
                          )}
                        </td>
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

      {actionItem && (
        <OfferActionModal
          clickedItem={actionItem}
          allItems={items}
          onClose={() => setActionItem(null)}
          onConfirm={onUpdateItem}
        />
      )}
    </div>
  );
}

const ACTIONS = {
  angebot: { label: 'Angebot geschickt' },
  durchgefuehrt: { label: 'Wartung durchgeführt' },
  archivieren: { label: 'Möchten keine Wartung' },
};

function OfferActionModal({ clickedItem, allItems, onClose, onConfirm }) {
  const relatedItems = useMemo(
    () => allItems.filter(i => groupKey(i) === groupKey(clickedItem)),
    [allItems, clickedItem]
  );
  const [action, setAction] = useState('angebot');
  const [selected, setSelected] = useState(() => new Set([clickedItem.id]));
  const [date, setDate] = useState(todayISO());
  const [customNote, setCustomNote] = useState('');
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (selected.size === 0) return;
    setSaving(true);
    const targets = relatedItems.filter(i => selected.has(i.id));
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let autoEntry = null;
    let patchBase = {};
    if (action === 'angebot') {
      autoEntry = `Angebot für Wartung verschickt am ${dateLabel}`;
    } else if (action === 'durchgefuehrt') {
      patchBase = { letzte_wartung: date, naechste_wartung: addOneYear(date) };
    } else if (action === 'archivieren') {
      autoEntry = `Möchten keine Wartung – Stand ${dateLabel}`;
      patchBase = { aktiv: false };
    }

    const customText = customNote.trim();
    const combinedEntry = [autoEntry, customText].filter(Boolean).join(' | ');

    for (const item of targets) {
      const patch = { ...patchBase };
      if (combinedEntry) {
        patch.notiz = item.notiz ? `${item.notiz} | ${combinedEntry}` : combinedEntry;
      }
      if (Object.keys(patch).length > 0) {
        await onConfirm(item.id, patch);
      }
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5E0]">
          <span className="text-[14px] font-semibold text-[#1C2530]">{clickedItem.kunde}</span>
          <button onClick={onClose} className="text-[#9AA3AC] hover:text-[#1C2530]"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[#5B6570]">Aktion</span>
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]"
            >
              {Object.entries(ACTIONS).map(([key, a]) => <option key={key} value={key}>{a.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[#5B6570]">Eigene Notiz (optional)</span>
            <textarea
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              rows={2}
              placeholder="Zusätzlicher Hinweis, wird mit an die Notiz angehängt …"
              className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]"
            />
          </label>

          <div>
            <div className="text-[12px] font-medium text-[#5B6570] mb-1.5">
              Geräte auswählen{relatedItems.length > 1 ? ` (${relatedItems.length} bei diesem Kunden)` : ''}
            </div>
            <div className="flex flex-col gap-1.5">
              {relatedItems.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggle(i.id)}
                  className="flex items-center gap-2 bg-[#F7F8F6] rounded-lg px-2.5 py-2 text-left"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selected.has(i.id) ? 'bg-[#2B6E63]' : 'border border-[#C9CFC7]'}`}>
                    {selected.has(i.id) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="text-[12.5px] text-[#1C2530]">
                    {i.modell || 'Gerät'}{i.seriennummer ? ` · ${i.seriennummer}` : ''}
                    {!i.aktiv && <span className="text-[#B0B7BD]"> · archiviert</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[#5B6570]">
              {action === 'angebot' ? 'Datum des Angebots' : 'Datum der durchgeführten Wartung'}
            </span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]"
            />
            {action === 'durchgefuehrt' && (
              <span className="text-[11px] text-[#8B95A1] mt-0.5">
                Letzte Wartung wird auf dieses Datum gesetzt, nächste Wartung automatisch auf {new Date(addOneYear(date) + 'T00:00:00').toLocaleDateString('de-DE')}.
              </span>
            )}
            {action === 'archivieren' && (
              <span className="text-[11px] text-[#8B95A1] mt-0.5">
                Die ausgewählten Geräte verschwinden aus "Überfällig" und "Diesen Monat fällig", bleiben aber in der Wartungsübersicht sichtbar.
              </span>
            )}
          </label>

          <button
            onClick={confirm}
            disabled={saving || selected.size === 0}
            className="bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644] disabled:opacity-50"
          >
            {saving ? 'Speichern …' : `Bestätigen (${selected.size} Gerät${selected.size === 1 ? '' : 'e'})`}
          </button>
        </div>
      </div>
    </div>
  );
}
