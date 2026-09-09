'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Calendar, ClipboardList, StickyNote, Plus, X, Trash2, Wrench, Settings2, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import WartungView from './WartungView';

const TYPE_STYLES = {
  Wartung:      { bg: 'bg-[#E8F1EF]', text: 'text-[#2B6E63]', dot: 'bg-[#2B6E63]' },
  Installation: { bg: 'bg-[#FBEFE6]', text: 'text-[#B7622E]', dot: 'bg-[#B7622E]' },
  Allgemein:    { bg: 'bg-[#EEF0EC]', text: 'text-[#5B6570]', dot: 'bg-[#5B6570]' },
};
const STATUS_COLUMNS = [
  { key: 'offen', label: 'Offen' },
  { key: 'arbeit', label: 'In Arbeit' },
  { key: 'erledigt', label: 'Erledigt' },
];
const INSTALL_CHECKLIST = [
  'Vor-Ort-Termin abstimmen',
  'Materialliste prüfen und bestellen',
  'Bestandsanlage / Anschlusssituation prüfen',
  'Installation durchführen',
  'Funktionsprüfung & Inbetriebnahme',
  'Einweisung Kunde',
  'Übergabeprotokoll erstellen',
];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d - now) / 86400000);
}

// --- Mapping zwischen DB-Spalten (snake_case) und UI-Feldern (camelCase) ---
const taskFromDb = (r) => ({ id: r.id, title: r.title, type: r.type, status: r.status, assignee: r.assignee, dueDate: r.due_date, notes: r.notes, checklist: r.checklist || [] });
const taskToDb = (t) => ({ id: t.id, title: t.title, type: t.type, status: t.status, assignee: t.assignee || null, due_date: t.dueDate || null, notes: t.notes || null, checklist: t.checklist || [] });
const protoFromDb = (r) => ({ id: r.id, anlage: r.anlage, datum: r.datum, techniker: r.techniker, arbeiten: r.arbeiten, befund: r.befund, ersatzteile: r.ersatzteile, naechsteWartung: r.naechste_wartung, taskId: r.task_id });
const protoToDb = (p) => ({ id: p.id, anlage: p.anlage, datum: p.datum, techniker: p.techniker || null, arbeiten: p.arbeiten || null, befund: p.befund || null, ersatzteile: p.ersatzteile || null, naechste_wartung: p.naechsteWartung || null, task_id: p.taskId || null });
const noteFromDb = (r) => ({ id: r.id, title: r.title, content: r.content, date: r.date });
const noteToDb = (n) => ({ id: n.id, title: n.title || null, content: n.content || null, date: n.date });
const maintFromDb = (r) => ({ id: r.id, kundenId: r.kunden_id, kunde: r.kunde, modell: r.modell, seriennummer: r.seriennummer, installation: r.installation, letzteWartung: r.letzte_wartung, naechsteWartung: r.naechste_wartung, notiz: r.notiz });

export default function Dashboard() {
  const [tab, setTab] = useState('kanban');
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tasks, setTasks] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [notes, setNotes] = useState([]);
  const [maintenanceItems, setMaintenanceItems] = useState([]);

  const [taskModal, setTaskModal] = useState(null);
  const [protocolModal, setProtocolModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const loadAll = useCallback(async () => {
    const [t, p, n, m] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('protocols').select('*').order('created_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('maintenance_items').select('*').order('kunde', { ascending: true }),
    ]);
    if (t.error || p.error || n.error || m.error) {
      setErrorMsg((t.error || p.error || n.error || m.error).message);
    } else {
      setTasks(t.data.map(taskFromDb));
      setProtocols(p.data.map(protoFromDb));
      setNotes(n.data.map(noteFromDb));
      setMaintenanceItems(m.data.map(maintFromDb));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel('wartungs-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'protocols' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_items' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  async function upsertTask(task) {
    const { error } = await supabase.from('tasks').upsert(taskToDb(task));
    if (error) setErrorMsg(error.message); else { setTaskModal(null); loadAll(); }
  }
  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setErrorMsg(error.message); else loadAll();
  }
  async function setTaskStatus(id, status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) setErrorMsg(error.message); else loadAll();
  }

  async function upsertProtocol(p) {
    const { error } = await supabase.from('protocols').upsert(protoToDb(p));
    if (error) setErrorMsg(error.message); else { setProtocolModal(null); loadAll(); }
  }
  async function deleteProtocol(id) {
    const { error } = await supabase.from('protocols').delete().eq('id', id);
    if (error) setErrorMsg(error.message); else loadAll();
  }

  async function updateMaintenanceNotiz(id, notiz) {
    const { error } = await supabase.from('maintenance_items').update({ notiz }).eq('id', id);
    if (error) setErrorMsg(error.message); else loadAll();
  }

  async function upsertNote(n) {
    const { error } = await supabase.from('notes').upsert(noteToDb(n));
    if (error) setErrorMsg(error.message); else { setNoteModal(null); loadAll(); }
  }
  async function deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) setErrorMsg(error.message); else loadAll();
  }

  if (!ready) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#F7F8F6] text-[#5B6570]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Dashboard wird geladen …
      </div>
    );
  }

  const upcoming = tasks
    .filter(t => t.dueDate && t.status !== 'erledigt')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-[#F7F8F6] font-sans text-[#1C2530]">
      <div className="md:w-56 w-full bg-[#1C2530] text-[#DDE2E6] flex md:flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10 hidden md:block">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#5FA79A]" />
            <span className="text-[15px] font-semibold tracking-tight text-white">Technik-Dashboard</span>
          </div>
          <p className="text-[12px] text-[#8B95A1] mt-1">Wartung &amp; Installation</p>
        </div>
        <nav className="flex md:flex-col flex-1 md:py-3 md:px-2 justify-around md:justify-start">
          {[
            { key: 'wartung', label: 'Wartung', icon: Settings2 },
            { key: 'kanban', label: 'Aufgaben', icon: LayoutGrid },
            { key: 'kalender', label: 'Kalender', icon: Calendar },
            { key: 'protokolle', label: 'Protokolle', icon: ClipboardList },
            { key: 'notizen', label: 'Notizen', icon: StickyNote },
          ].map(item => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 px-3 py-2.5 md:mx-1 my-0.5 rounded-lg text-[13px] transition-colors ${active ? 'bg-white/10 text-white font-medium' : 'text-[#9AA3AC] hover:text-white hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-x-auto">
        {errorMsg && (
          <div className="mb-4 text-[12px] bg-[#FBE9E6] text-[#C1553A] rounded-lg px-3 py-2">
            Fehler: {errorMsg}
          </div>
        )}
        {tab === 'wartung' && <WartungView items={maintenanceItems} onUpdateNotiz={updateMaintenanceNotiz} />}
        {tab === 'kanban' && (
          <KanbanView tasks={tasks} onNew={() => setTaskModal({})} onEdit={t => setTaskModal(t)} onDelete={deleteTask} onStatus={setTaskStatus} />
        )}
        {tab === 'kalender' && (
          <CalendarView tasks={tasks} monthCursor={monthCursor} setMonthCursor={setMonthCursor} upcoming={upcoming} onEdit={t => setTaskModal(t)} />
        )}
        {tab === 'protokolle' && (
          <ProtocolsView protocols={protocols} tasks={tasks} onNew={() => setProtocolModal({})} onEdit={p => setProtocolModal(p)} onDelete={deleteProtocol} />
        )}
        {tab === 'notizen' && (
          <NotesView notes={notes} onNew={() => setNoteModal({})} onEdit={n => setNoteModal(n)} onDelete={deleteNote} />
        )}
      </div>

      {taskModal && <TaskModal initial={taskModal} onClose={() => setTaskModal(null)} onSave={upsertTask} />}
      {protocolModal && <ProtocolModal initial={protocolModal} tasks={tasks} onClose={() => setProtocolModal(null)} onSave={upsertProtocol} />}
      {noteModal && <NoteModal initial={noteModal} onClose={() => setNoteModal(null)} onSave={upsertNote} />}
    </div>
  );
}

function KanbanView({ tasks, onNew, onEdit, onDelete, onStatus }) {
  return (
    <div>
      <ViewHeader title="Aufgaben" subtitle="Wartungen und Neu-Installationen im Überblick" onNew={onNew} newLabel="Neue Aufgabe" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {STATUS_COLUMNS.map(col => {
          const items = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="bg-[#EEF0EC] rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[13px] font-medium text-[#5B6570]">{col.label}</span>
                <span className="text-[11px] text-[#9AA3AC]">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && <div className="text-[12px] text-[#B0B7BD] px-1 py-4 text-center">Keine Aufgaben</div>}
                {items.map(t => {
                  const style = TYPE_STYLES[t.type] || TYPE_STYLES.Allgemein;
                  const dleft = daysUntil(t.dueDate);
                  const overdue = dleft !== null && dleft < 0 && t.status !== 'erledigt';
                  const doneCount = t.checklist?.filter(c => c.done).length || 0;
                  return (
                    <div key={t.id} className="bg-white rounded-lg border border-[#E2E5E0] p-3 hover:border-[#C9CFC7] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => onEdit(t)} className="text-left flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.bg} ${style.text} font-medium`}>{t.type}</span>
                            {overdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBE9E6] text-[#C1553A] font-medium">Überfällig</span>}
                          </div>
                          <div className="text-[13px] font-medium text-[#1C2530] leading-snug">{t.title}</div>
                        </button>
                        <button onClick={() => onDelete(t.id)} className="text-[#C4CAD0] hover:text-[#C1553A] shrink-0 mt-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-[#8B95A1]">
                        <span>{t.assignee || '—'}</span>
                        {t.dueDate && <span className={overdue ? 'text-[#C1553A] font-medium' : ''}>{fmtDate(t.dueDate)}</span>}
                      </div>
                      {t.checklist?.length > 0 && (
                        <div className="mt-2">
                          <div className="h-1 bg-[#EEF0EC] rounded-full overflow-hidden">
                            <div className="h-full bg-[#5FA79A]" style={{ width: `${(doneCount / t.checklist.length) * 100}%` }} />
                          </div>
                          <div className="text-[10px] text-[#9AA3AC] mt-1">{doneCount}/{t.checklist.length} Schritte erledigt</div>
                        </div>
                      )}
                      <div className="flex gap-1 mt-2">
                        {STATUS_COLUMNS.map(c => (
                          <button key={c.key} onClick={() => onStatus(t.id, c.key)}
                            className={`flex-1 text-[10px] py-1 rounded ${c.key === t.status ? 'bg-[#1C2530] text-white' : 'bg-[#F7F8F6] text-[#9AA3AC] hover:bg-[#EEF0EC]'}`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ tasks, monthCursor, setMonthCursor, upcoming, onEdit }) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tasksByDay = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const dt = new Date(t.dueDate + 'T00:00:00');
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      tasksByDay[dt.getDate()] = tasksByDay[dt.getDate()] || [];
      tasksByDay[dt.getDate()].push(t);
    }
  });

  const monthLabel = monthCursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div>
      <ViewHeader title="Kalender" subtitle="Fällige Wartungen und Termine" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-6">
        <div className="bg-white rounded-xl border border-[#E2E5E0] p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonthCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded hover:bg-[#EEF0EC] text-[#5B6570]"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[14px] font-medium capitalize">{monthLabel}</span>
            <button onClick={() => setMonthCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded hover:bg-[#EEF0EC] text-[#5B6570]"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#9AA3AC] mb-1">
            {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const items = d ? tasksByDay[d] : null;
              const isToday = d && new Date().toDateString() === new Date(year, month, d).toDateString();
              return (
                <div key={i} className={`min-h-[64px] rounded-lg p-1 text-[11px] ${d ? 'bg-[#F7F8F6]' : ''} ${isToday ? 'ring-1 ring-[#5FA79A]' : ''}`}>
                  {d && <div className={`mb-1 ${isToday ? 'text-[#2B6E63] font-semibold' : 'text-[#8B95A1]'}`}>{d}</div>}
                  <div className="flex flex-col gap-0.5">
                    {items?.slice(0, 2).map(t => {
                      const style = TYPE_STYLES[t.type] || TYPE_STYLES.Allgemein;
                      return <button key={t.id} onClick={() => onEdit(t)} className={`truncate text-left px-1 py-0.5 rounded ${style.bg} ${style.text}`} title={t.title}>{t.title}</button>;
                    })}
                    {items?.length > 2 && <span className="text-[10px] text-[#9AA3AC] px-1">+{items.length - 2} weitere</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E5E0] p-4">
          <div className="text-[13px] font-medium text-[#1C2530] mb-3">Nächste Termine</div>
          <div className="flex flex-col gap-2">
            {upcoming.length === 0 && <div className="text-[12px] text-[#B0B7BD]">Keine offenen Termine</div>}
            {upcoming.map(t => {
              const d = daysUntil(t.dueDate);
              const overdue = d < 0;
              const style = TYPE_STYLES[t.type] || TYPE_STYLES.Allgemein;
              return (
                <button key={t.id} onClick={() => onEdit(t)} className="text-left border border-[#E2E5E0] rounded-lg p-2.5 hover:border-[#C9CFC7]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    <span className="text-[12px] font-medium truncate">{t.title}</span>
                  </div>
                  <div className={`text-[11px] mt-1 ${overdue ? 'text-[#C1553A] font-medium' : 'text-[#8B95A1]'}`}>
                    {fmtDate(t.dueDate)} · {overdue ? `${Math.abs(d)} Tage überfällig` : d === 0 ? 'heute' : `in ${d} Tagen`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolsView({ protocols, onNew, onEdit, onDelete }) {
  return (
    <div>
      <ViewHeader title="Wartungsprotokolle" subtitle="Dokumentation durchgeführter Arbeiten" onNew={onNew} newLabel="Neues Protokoll" />
      <div className="flex flex-col gap-3 mt-6">
        {protocols.length === 0 && <div className="text-[13px] text-[#B0B7BD] bg-white border border-dashed border-[#E2E5E0] rounded-xl p-8 text-center">Noch keine Protokolle erstellt.</div>}
        {protocols.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-[#E2E5E0] p-4">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => onEdit(p)} className="text-left flex-1">
                <div className="text-[14px] font-medium text-[#1C2530]">{p.anlage}</div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5">{fmtDate(p.datum)} · Techniker: {p.techniker || '—'}</div>
              </button>
              <button onClick={() => onDelete(p.id)} className="text-[#C4CAD0] hover:text-[#C1553A]"><Trash2 className="w-4 h-4" /></button>
            </div>
            {p.arbeiten && <p className="text-[12px] text-[#5B6570] mt-2 leading-relaxed">{p.arbeiten}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-[#8B95A1]">
              {p.befund && <span>Zustand: <span className="text-[#1C2530]">{p.befund}</span></span>}
              {p.ersatzteile && <span>Ersatzteile: <span className="text-[#1C2530]">{p.ersatzteile}</span></span>}
              {p.naechsteWartung && <span>Nächste Wartung: <span className="text-[#1C2530]">{fmtDate(p.naechsteWartung)}</span></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesView({ notes, onNew, onEdit, onDelete }) {
  return (
    <div>
      <ViewHeader title="Notizen" subtitle="Kurze Infos, Absprachen und Hinweise" onNew={onNew} newLabel="Neue Notiz" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {notes.length === 0 && <div className="text-[13px] text-[#B0B7BD] bg-white border border-dashed border-[#E2E5E0] rounded-xl p-8 text-center col-span-full">Noch keine Notizen.</div>}
        {notes.map(n => (
          <div key={n.id} className="bg-white rounded-xl border border-[#E2E5E0] p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => onEdit(n)} className="text-left flex-1"><div className="text-[13px] font-medium text-[#1C2530]">{n.title || 'Ohne Titel'}</div></button>
              <button onClick={() => onDelete(n.id)} className="text-[#C4CAD0] hover:text-[#C1553A]"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-[12px] text-[#5B6570] mt-1.5 leading-relaxed whitespace-pre-wrap flex-1">{n.content}</p>
            <div className="text-[10px] text-[#9AA3AC] mt-2">{fmtDate(n.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewHeader({ title, subtitle, onNew, newLabel }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[19px] font-semibold text-[#1C2530] tracking-tight">{title}</h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">{subtitle}</p>
      </div>
      {onNew && (
        <button onClick={onNew} className="flex items-center gap-1.5 bg-[#1C2530] text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:bg-[#2A3644] shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{newLabel}</span>
        </button>
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5E0]">
          <span className="text-[14px] font-semibold text-[#1C2530]">{title}</span>
          <button onClick={onClose} className="text-[#9AA3AC] hover:text-[#1C2530]"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="px-5 py-4 flex flex-col gap-3.5">{children}</form>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[#5B6570]">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px] text-[#1C2530] focus:outline-none focus:ring-1 focus:ring-[#5FA79A] focus:border-[#5FA79A]";

function TaskModal({ initial, onClose, onSave }) {
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title || '');
  const [type, setType] = useState(initial.type || 'Wartung');
  const [assignee, setAssignee] = useState(initial.assignee || '');
  const [dueDate, setDueDate] = useState(initial.dueDate || '');
  const [status, setStatus] = useState(initial.status || 'offen');
  const [notes, setNotes] = useState(initial.notes || '');
  const [checklist, setChecklist] = useState(initial.checklist || []);
  const [newItem, setNewItem] = useState('');

  function applyTemplate() { setChecklist(INSTALL_CHECKLIST.map(text => ({ text, done: false }))); }
  function addItem() { if (!newItem.trim()) return; setChecklist([...checklist, { text: newItem.trim(), done: false }]); setNewItem(''); }
  function removeItem(i) { setChecklist(checklist.filter((_, idx) => idx !== i)); }
  function toggleItem(i) { setChecklist(checklist.map((c, idx) => idx === i ? { ...c, done: !c.done } : c)); }

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ id: initial.id || crypto.randomUUID(), title: title.trim(), type, assignee, dueDate: dueDate || null, status, notes, checklist });
  }

  return (
    <ModalShell title={isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'} onClose={onClose} onSubmit={submit}>
      <Field label="Titel"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Wartung Klimaanlage Halle 3" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Art">
          <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
            <option>Wartung</option><option>Installation</option><option>Allgemein</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zuständig"><input className={inputCls} value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Name" /></Field>
        <Field label="Fällig am"><input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
      </div>
      <Field label="Notiz"><textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details, Zugang, Ansprechpartner …" /></Field>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-[#5B6570]">To-Do-Checkliste</span>
          {type === 'Installation' && checklist.length === 0 && (
            <button type="button" onClick={applyTemplate} className="text-[11px] text-[#2B6E63] font-medium hover:underline">Standard-Checkliste einfügen</button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {checklist.map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#F7F8F6] rounded-lg px-2.5 py-1.5">
              <button type="button" onClick={() => toggleItem(i)} className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${c.done ? 'bg-[#2B6E63]' : 'border border-[#C9CFC7]'}`}>
                {c.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`text-[12px] flex-1 ${c.done ? 'line-through text-[#B0B7BD]' : 'text-[#1C2530]'}`}>{c.text}</span>
              <button type="button" onClick={() => removeItem(i)} className="text-[#C4CAD0] hover:text-[#C1553A]"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1.5">
          <input className={inputCls} value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder="Schritt hinzufügen …" />
          <button type="button" onClick={addItem} className="px-3 rounded-lg bg-[#EEF0EC] text-[#5B6570] text-[13px] hover:bg-[#E2E5E0]">+</button>
        </div>
      </div>
      <button type="submit" className="mt-2 bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644]">Speichern</button>
    </ModalShell>
  );
}

function ProtocolModal({ initial, tasks, onClose, onSave }) {
  const isNew = !initial.id;
  const [anlage, setAnlage] = useState(initial.anlage || '');
  const [datum, setDatum] = useState(initial.datum || todayISO());
  const [techniker, setTechniker] = useState(initial.techniker || '');
  const [arbeiten, setArbeiten] = useState(initial.arbeiten || '');
  const [befund, setBefund] = useState(initial.befund || '');
  const [ersatzteile, setErsatzteile] = useState(initial.ersatzteile || '');
  const [naechsteWartung, setNaechsteWartung] = useState(initial.naechsteWartung || '');
  const [taskId, setTaskId] = useState(initial.taskId || '');

  function submit(e) {
    e.preventDefault();
    if (!anlage.trim()) return;
    onSave({ id: initial.id || crypto.randomUUID(), anlage: anlage.trim(), datum, techniker, arbeiten, befund, ersatzteile, naechsteWartung: naechsteWartung || null, taskId: taskId || null });
  }

  return (
    <ModalShell title={isNew ? 'Neues Wartungsprotokoll' : 'Protokoll bearbeiten'} onClose={onClose} onSubmit={submit}>
      <Field label="Anlage / Objekt"><input className={inputCls} value={anlage} onChange={e => setAnlage(e.target.value)} placeholder="z. B. Lüftungsanlage Gebäude A" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum"><input type="date" className={inputCls} value={datum} onChange={e => setDatum(e.target.value)} /></Field>
        <Field label="Techniker"><input className={inputCls} value={techniker} onChange={e => setTechniker(e.target.value)} placeholder="Name" /></Field>
      </div>
      <Field label="Verknüpfte Aufgabe (optional)">
        <select className={inputCls} value={taskId} onChange={e => setTaskId(e.target.value)}>
          <option value="">— keine —</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <Field label="Durchgeführte Arbeiten"><textarea className={inputCls} rows={3} value={arbeiten} onChange={e => setArbeiten(e.target.value)} placeholder="Was wurde gemacht?" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zustand / Befund"><input className={inputCls} value={befund} onChange={e => setBefund(e.target.value)} placeholder="z. B. i. O., Verschleiß …" /></Field>
        <Field label="Ersatzteile"><input className={inputCls} value={ersatzteile} onChange={e => setErsatzteile(e.target.value)} placeholder="verwendet / benötigt" /></Field>
      </div>
      <Field label="Nächste Wartung"><input type="date" className={inputCls} value={naechsteWartung} onChange={e => setNaechsteWartung(e.target.value)} /></Field>
      <button type="submit" className="mt-2 bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644]">Speichern</button>
    </ModalShell>
  );
}

function NoteModal({ initial, onClose, onSave }) {
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title || '');
  const [content, setContent] = useState(initial.content || '');

  function submit(e) {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    onSave({ id: initial.id || crypto.randomUUID(), title: title.trim(), content: content.trim(), date: initial.date || todayISO() });
  }

  return (
    <ModalShell title={isNew ? 'Neue Notiz' : 'Notiz bearbeiten'} onClose={onClose} onSubmit={submit}>
      <Field label="Titel"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Kurzer Titel" autoFocus /></Field>
      <Field label="Inhalt"><textarea className={inputCls} rows={5} value={content} onChange={e => setContent(e.target.value)} placeholder="Notiztext …" /></Field>
      <button type="submit" className="mt-2 bg-[#1C2530] text-white text-[13px] font-medium py-2.5 rounded-lg hover:bg-[#2A3644]">Speichern</button>
    </ModalShell>
  );
}
