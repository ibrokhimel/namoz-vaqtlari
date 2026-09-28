// TV settings panel, operated with the D-pad remote.
//  Hold OK (Enter / DPAD_CENTER) for 2 s  -> open
//  Up/Down move between rows     Left/Right change value (saved at once;
//                                city and method wait for OK)
//  OK   edit a text field (opens the TV keyboard) / run an action
//  Back / Esc                    -> close
import { useEffect, useRef, useState } from 'react';
import {
  ASR_METHODS, CITIES, DEFAULT_SETTINGS, METHODS, appNow, decimalToHHMM,
  getTimesForDate, loadSettings, saveSettings,
} from '../core/prayer.js';
import { PRAYERS_TV } from '../core/day.js';
import { checkNow, installUpdate, useUpdate } from './update-store.js';

const HOLD_MS = 2000;
const OK_KEYS = new Set(['Enter', 'NumpadEnter', 'Select']);
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);

const ROWS = [
  { type: 'text',   key: 'mosqueName',   label: 'Masjid nomi',  max: 60 },
  { type: 'text',   key: 'mosqueArabic', label: 'Arabcha nomi', max: 40, rtl: true },
  { type: 'choice', key: 'city',      label: 'Shahar',          options: Object.keys(CITIES),      fmt: k => CITIES[k].name },
  { type: 'choice', key: 'method',    label: 'Hisoblash usuli', options: Object.keys(METHODS),     fmt: k => METHODS[k].name },
  { type: 'choice', key: 'asrMethod', label: 'Asr mazhabi',     options: Object.keys(ASR_METHODS), fmt: k => ASR_METHODS[k].name },
  { type: 'choice', key: 'nextLeadMin', label: 'Keyingi namozga oʻtish', options: [10, 15, 20, 30, 45, 60], fmt: k => `${k} daq oldin` },
  { type: 'choice', key: 'weatherBg', label: 'Ob-havo foni', options: [true, false], fmt: k => (k ? 'Yoqilgan' : 'Oʻchirilgan') },
  ...PRAYERS_TV.map(p => ({ type: 'adj', key: p.key, label: `${p.nameUz}: tuzatish`, min: -30, max: 30, unit: 'daq' })),
  { type: 'num',    key: 'hijriAdj', label: 'Hijriy sana', min: -3, max: 3, unit: 'kun' },
  { type: 'action', id: 'update', label: 'Yangilanishni tekshirish' },
  { type: 'action', id: 'reset', label: 'Standart sozlamalarga qaytarish' },
  { type: 'action', id: 'close', label: 'Yopish' },
];
const signed = n => `${n > 0 ? '+' : ''}${n}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function SettingsPanel({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [focus, setFocus] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState(null);     // { key, value } choice awaiting OK
  const [savedRow, setSavedRow] = useState(-1);
  const holdTimer = useRef(null);
  const upd = useUpdate();
  const updRef = useRef(upd);
  updRef.current = upd;
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const editBefore = useRef('');

  // one live snapshot of state for the key handler
  const S = useRef({});
  S.current = { open, focus, editing, confirmReset, pending };

  const save = mutate => {
    const s = loadSettings(); mutate(s); saveSettings(s); onChange(loadSettings());
  };

  const leaveRow = next => { setFocus(next); setConfirmReset(false); setPending(null); setSavedRow(-1); };

  const change = dir => {
    const row = ROWS[S.current.focus];
    if (row.type === 'choice') {
      // preview only: city and method change every time on the mosque screen
      const cur = S.current.pending?.key === row.key ? S.current.pending.value : loadSettings()[row.key];
      const next = row.options[(Math.max(0, row.options.indexOf(cur)) + dir + row.options.length) % row.options.length];
      setPending(next === loadSettings()[row.key] ? null : { key: row.key, value: next });
      setSavedRow(-1);
    } else if (row.type === 'adj') {
      save(s => { s.adjustments[row.key] = clamp((s.adjustments[row.key] || 0) + dir, row.min, row.max); });
    } else if (row.type === 'num') {
      save(s => { s[row.key] = clamp((s[row.key] || 0) + dir, row.min, row.max); });
    }
  };

  const close = () => { setOpen(false); setEditing(false); setConfirmReset(false); setPending(null); setSavedRow(-1); };

  const activate = () => {
    const { focus: f, pending: pend, confirmReset: cr } = S.current;
    const row = ROWS[f];
    if (row.type === 'text') {
      editBefore.current = inputRef.current?.value || '';
      setEditing(true);
      return;
    }
    if (row.type === 'choice') {
      if (pend?.key === row.key) { save(s => { s[row.key] = pend.value; }); setPending(null); setSavedRow(f); }
      return;
    }
    if (row.id === 'update') {
      if (updRef.current.status === 'available') { close(); installUpdate(); }
      else checkNow({ prompt: true });
      return;
    }
    if (row.id === 'close') return close();
    if (row.id === 'reset') {
      if (!cr) return setConfirmReset(true);
      setConfirmReset(false);
      save(s => Object.assign(s, DEFAULT_SETTINGS, { adjustments: { ...DEFAULT_SETTINGS.adjustments } }));
    }
  };

  const endEdit = commit => {
    const row = ROWS[S.current.focus], input = inputRef.current;
    setEditing(false);
    input?.blur();
    if (commit) save(s => { s[row.key] = (input?.value || '').trim().slice(0, row.max); });
    else if (input) input.value = editBefore.current;
  };

  useEffect(() => {
    const cancelHold = () => { clearTimeout(holdTimer.current); holdTimer.current = null; setHolding(false); };
    const down = e => {
      const s = S.current;
      if (!s.open) {
        if (OK_KEYS.has(e.key) && !e.repeat && !holdTimer.current) {
          setHolding(true);
          holdTimer.current = setTimeout(() => { cancelHold(); setFocus(0); setOpen(true); }, HOLD_MS);
        }
        return;
      }
      if (s.editing) {
        if (e.key === 'Enter') { e.preventDefault(); endEdit(true); }
        else if (e.key === 'Escape') { e.preventDefault(); endEdit(false); }
        return;                                   // everything else types into the field
      }
      if (e.repeat && OK_KEYS.has(e.key)) return; // still holding OK from opening
      const k = e.key;
      if (k === 'ArrowDown') leaveRow(Math.min(ROWS.length - 1, s.focus + 1));
      else if (k === 'ArrowUp') leaveRow(Math.max(0, s.focus - 1));
      else if (k === 'ArrowRight') change(+1);
      else if (k === 'ArrowLeft') change(-1);
      else if (OK_KEYS.has(k)) activate();
      else if (BACK_KEYS.has(k)) close();
      else return;
      e.preventDefault();
    };
    const up = e => { if (OK_KEYS.has(e.key)) cancelHold(); };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('blur', cancelHold);
    window.tvSettings = { open: () => { setFocus(0); setOpen(true); }, close };   // tests / Android menu bridge
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('blur', cancelHold);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // focused row stays in view. Scroll only the list itself: scrollIntoView
  // would also scroll the overflow:hidden stage towards the off-screen panel.
  useEffect(() => {
    const list = listRef.current, el = list?.children[focus];
    if (!open || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
  }, [focus, open]);
  useEffect(() => {
    const input = inputRef.current;
    if (editing && input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }, [editing]);

  const times = getTimesForDate(appNow(), settings, CITIES[settings.city] || CITIES.Tashkent);

  return (
    <>
      <div className={`hold-hint${holding ? ' holding' : ''}`}><span>Sozlamalar ochilmoqda…</span><i /></div>
      <aside className={`tv-settings${open ? ' open' : ''}`} role="dialog" aria-label="Sozlamalar">
        <header className="ts-head">
          <h2>Sozlamalar</h2>
          <p>▲▼ tanlash · ◀▶ oʻzgartirish · OK tahrirlash · Orqaga — yopish</p>
        </header>
        <ol className="ts-list" ref={listRef}>
          {ROWS.map((row, i) => {
            const focused = i === focus;
            const stepper = row.type === 'choice' || row.type === 'adj' || row.type === 'num';
            const label = row.id === 'reset' && confirmReset && focused ? 'Tasdiqlash uchun yana OK bosing'
              : row.id === 'update' ? updateLabel(upd) : row.label;
            const cls = `ts-row ts-${row.type}${focused ? ' focused' : ''}${focused && editing ? ' editing' : ''}`;
            return (
              <li key={row.key || row.id} className={cls}>
                <span className="ts-label">{label}{i === savedRow && <span className="ts-saved">Saqlandi</span>}</span>
                <span className="ts-value">
                  {stepper && <b className="ts-arrow">◀</b>}
                  <RowValue row={row} settings={settings} pending={pending} times={times}
                    inputRef={focused ? inputRef : null} readOnly={!(focused && editing)} />
                  {stepper && <b className="ts-arrow">▶</b>}
                </span>
              </li>
            );
          })}
        </ol>
      </aside>
    </>
  );
}

function RowValue({ row, settings, pending, times, inputRef, readOnly }) {
  switch (row.type) {
    case 'text':
      return (
        <input ref={inputRef} className={`ts-input${row.rtl ? ' ts-ar' : ''}`} type="text" maxLength={row.max}
          dir={row.rtl ? 'auto' : undefined} lang={row.rtl ? 'ar' : undefined}
          defaultValue={settings[row.key] || ''} key={settings[row.key] || ''}
          placeholder="— (boʻsh)" readOnly={readOnly} tabIndex={-1} />
      );
    case 'choice': {
      const p = pending?.key === row.key;
      return <>{p && <span className="ts-pending">OK — saqlash</span>}<span className="ts-val">{row.fmt(p ? pending.value : settings[row.key])}</span></>;
    }
    case 'adj':
      return <><span className="ts-val">{signed(settings.adjustments[row.key] || 0)} {row.unit}</span><span className="ts-note">{decimalToHHMM(times[row.key])}</span></>;
    case 'num':
      return <span className="ts-val">{signed(settings[row.key] || 0)} {row.unit}</span>;
    default:
      return null;
  }
}

function updateLabel(u) {
  if (u.status === 'available') return `Yangilash: v${u.info.name} mavjud`;
  if (u.status === 'checking') return 'Tekshirilmoqda…';
  if (u.status === 'none') return `Eng soʻnggi versiya · v${u.current.name}`;
  if (u.status === 'error') return 'Tekshirib boʻlmadi · qayta urinish';
  return `Yangilanishni tekshirish · v${u.current.name}`;
}
