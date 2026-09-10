'use client';
import React, { useState } from 'react';
import { X, Check, ExternalLink } from 'lucide-react';
import { HARDWARE_ITEMS, SOFTWARE_ITEMS } from '../lib/wartungsChecklist';

function todayISO() { return new Date().toISOString().slice(0, 10); }
function addOneYear(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function ProtocolFormModal({ item, onClose, onSaveProtokoll, onUpdateItem }) {
  const [datum, setDatum] = useState(item.geplantDatum || todayISO());
  const [techniker, setTechniker] = useState('');
  const [hardware, setHardware] = useState(() => HARDWARE_ITEMS.map(() => false));
  const [software, setSoftware] = useState(() => SOFTWARE_ITEMS.map(() => false));
  const [notiz, setNotiz] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const allChecked = hardware.every(Boolean) && software.every(Boolean);

  function toggleHardware(i) { setHardware(prev => prev.map((v, idx) => idx === i ? !v : v)); }
  function toggleSoftware(i) { setSoftware(prev => prev.map((v, idx) => idx === i ? !v : v)); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const record = {
      maintenance_item_id: item.id,
      kunde: item.kunde,
      modell: item.modell,
      seriennummer: item.seriennummer,
      datum,
      techniker,
      hardware,
      software,
      notiz,
    };
    const inserted = await onSaveProtokoll(record);
    await onUpdateItem(item.id, {
      letzte_wartung: datum,
      naechste_wartung: addOneYear(datum),
      geplant_datum: null,
    });
    setSaving(false);
    if (inserted?.id) {
      setSavedId(inserted.id);
    } else {
      onClose();
    }
  }

  if (savedId) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-3 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-full bg-[#E8F1EF] flex items-center justify-center">
            <Check className="w-5 h-5 text-[#2B6E63]" />
          </div>
          <div className="text-[14px] font-semibold text-[#1C2530]">Wartung abgeschlossen</div>
          <p className="text-[12.5px] text-[#5B6570]">
            Protokoll gespeichert, Letzte/Nächste Wartung wurden aktualisiert. {item.kunde} ist jetzt auch in der Wartungsübersicht mit dem Protokoll verknüpft.
          </p>
          <a
            href={`/api/wartungsprotokoll?id=${savedId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#2B6E63] hover:underline"
          >
            Protokoll als PDF öffnen <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={onClose} className="mt-2 w-full bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644]">
            Fertig
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5E0] sticky top-0 bg-white">
          <div>
            <div className="text-[14px] font-semibold text-[#1C2530]">Wartungsprotokoll ausfüllen</div>
            <div className="text-[12px] text-[#8B95A1]">{item.kunde} · {item.modell}{item.seriennummer ? ` · ${item.seriennummer}` : ''}</div>
          </div>
          <button onClick={onClose} className="text-[#9AA3AC] hover:text-[#1C2530]"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5B6570]">Datum der Wartung</span>
              <input type="date" value={datum} onChange={e => setDatum(e.target.value)} required
                className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5B6570]">Techniker</span>
              <input value={techniker} onChange={e => setTechniker(e.target.value)} placeholder="Name" required
                className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[12.5px] font-semibold text-[#1C2530] mb-2">Hardware</div>
              <div className="flex flex-col gap-1">
                {HARDWARE_ITEMS.map((item2, i) => (
                  <button key={i} type="button" onClick={() => toggleHardware(i)} className="flex items-start gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-[#F7F8F6]">
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${hardware[i] ? 'bg-[#2B6E63]' : 'border border-[#C9CFC7]'}`}>
                      {hardware[i] && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-[12px] text-[#1C2530] leading-snug">{item2}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-[#1C2530] mb-2">Software</div>
              <div className="flex flex-col gap-1">
                {SOFTWARE_ITEMS.map((item2, i) => (
                  <button key={i} type="button" onClick={() => toggleSoftware(i)} className="flex items-start gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-[#F7F8F6]">
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${software[i] ? 'bg-[#2B6E63]' : 'border border-[#C9CFC7]'}`}>
                      {software[i] && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-[12px] text-[#1C2530] leading-snug">{item2}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!allChecked && (
            <div className="text-[11px] text-[#B7622E] bg-[#FBEFE6] rounded-lg px-3 py-2">
              Noch nicht alle Punkte abgehakt – das Protokoll lässt sich trotzdem speichern, falls einzelne Schritte nicht nötig waren.
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[#5B6570]">Notiz (optional)</span>
            <textarea value={notiz} onChange={e => setNotiz(e.target.value)} rows={2}
              placeholder="Besonderheiten, Ersatzteile, Auffälligkeiten …"
              className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5FA79A]" />
          </label>

          <div className="text-[11px] text-[#8B95A1] -mt-1">
            Speichert das Protokoll, setzt Letzte Wartung auf {datum ? new Date(datum + 'T00:00:00').toLocaleDateString('de-DE') : '–'} und Nächste Wartung automatisch auf {datum ? new Date(addOneYear(datum) + 'T00:00:00').toLocaleDateString('de-DE') : '–'}.
          </div>

          <button type="submit" disabled={saving}
            className="bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644] disabled:opacity-50">
            {saving ? 'Speichern …' : 'Wartung abschließen'}
          </button>
        </form>
      </div>
    </div>
  );
}
