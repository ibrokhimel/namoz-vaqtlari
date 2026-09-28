/* ─────────────────────────────────────────── */
/*  TV SETTINGS — D-pad remote settings panel  */
/*  Requires core.js and tv.js                 */
/* ─────────────────────────────────────────── */
//
//  Hold OK (Enter / DPAD_CENTER) for 2 s  → open
//  ▲ ▼  move between rows      ◀ ▶  change value (saved at once;
//                               city and method wait for OK)
//  OK   edit a text field (opens the TV keyboard) / run an action
//  Back / Esc                  → close
//
(function(){
  const HOLD_MS = 2000;
  const OK_KEYS   = new Set(['Enter', 'NumpadEnter', 'Select']);
  const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);

  const ROWS = [
    { type:'text',   key:'mosqueName',   label:'Masjid nomi',   placeholder:'Namoz Vaqtlari', max:60 },
    { type:'text',   key:'mosqueArabic', label:'Arabcha nomi',  placeholder:'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم', max:40, rtl:true },
    { type:'choice', key:'city',      label:'Shahar',          options:()=>Object.keys(CITIES),      fmt:k=>CITIES[k].name },
    { type:'choice', key:'method',    label:'Hisoblash usuli', options:()=>Object.keys(METHODS),     fmt:k=>METHODS[k].name },
    { type:'choice', key:'asrMethod', label:'Asr mazhabi',     options:()=>Object.keys(ASR_METHODS), fmt:k=>ASR_METHODS[k].name },
    ...PRAYERS_TV.map(p=>({ type:'adj', key:p.key, label:`${p.nameUz}: tuzatish`, min:-30, max:30, unit:'daq' })),
    { type:'num',    key:'hijriAdj',  label:'Hijriy sana',     min:-3, max:3, unit:'kun' },
    { type:'action', id:'reset',      label:'Standart sozlamalarga qaytarish' },
    { type:'action', id:'close',      label:'Yopish' },
  ];

  let panel, list, holdBar, holdTimer = null, open = false, focus = 0, editing = null, confirmReset = false;
  let pending = null;   // { row, value } a city/method choice not yet confirmed with OK
  let savedRow = -1;    // row that shows a brief 'Saqlandi' after OK

  const signed = n => `${n > 0 ? '+' : ''}${n}`;

  function build(){
    const stage = document.getElementById('stage');
    holdBar = document.createElement('div');
    holdBar.className = 'hold-hint';
    holdBar.innerHTML = '<span>Sozlamalar ochilmoqda…</span><i></i>';
    stage.appendChild(holdBar);

    panel = document.createElement('aside');
    panel.className = 'tv-settings';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Sozlamalar');
    panel.innerHTML = `
      <header class="ts-head">
        <h2>Sozlamalar</h2>
        <p>▲▼ tanlash · ◀▶ oʻzgartirish · OK tahrirlash · Orqaga — yopish</p>
      </header>
      <ol class="ts-list" id="tsList"></ol>`;
    stage.appendChild(panel);
    list = panel.querySelector('#tsList');
  }

  // Prayer time with the current adjustment, for the adjustment rows
  function adjustedTime(key){
    const s = loadSettings();
    const city = CITIES[s.city] || CITIES.Tashkent;
    return decimalToHHMM(getTimesForDate(appNow(), s, city)[key]);
  }

  function valueHtml(row, s){
    switch(row.type){
      case 'text': {
        const v = s[row.key] || '';
        return `<input class="ts-input${row.rtl ? ' ts-ar' : ''}" type="text" maxlength="${row.max}" ${row.rtl ? 'dir="auto" lang="ar"' : ''}
                  value="${v.replace(/"/g, '&quot;')}" placeholder="— (boʻsh)" readonly tabindex="-1">`;
      }
      case 'choice': {
        const p = pending && pending.row === row;
        return `${p ? '<span class="ts-pending">OK — saqlash</span>' : ''}<span class="ts-val">${row.fmt(p ? pending.value : s[row.key])}</span>`;
      }
      case 'adj':    return `<span class="ts-val">${signed(s.adjustments[row.key] || 0)} ${row.unit}</span><span class="ts-note">${adjustedTime(row.key)}</span>`;
      case 'num':    return `<span class="ts-val">${signed(s[row.key] || 0)} ${row.unit}</span>`;
      default:       return '';
    }
  }

  function render(){
    const s = loadSettings();
    list.innerHTML = '';
    ROWS.forEach((row, i) => {
      const li = document.createElement('li');
      li.className = `ts-row ts-${row.type}${i === focus ? ' focused' : ''}`;
      const label = row.id === 'reset' && confirmReset ? 'Tasdiqlash uchun yana OK bosing' : row.label;
      const stepper = row.type === 'choice' || row.type === 'adj' || row.type === 'num';
      const saved = i === savedRow ? '<span class="ts-saved">Saqlandi</span>' : '';
      li.innerHTML = `<span class="ts-label">${label}${saved}</span>
        <span class="ts-value">${stepper ? '<b class="ts-arrow">◀</b>' : ''}${valueHtml(row, s)}${stepper ? '<b class="ts-arrow">▶</b>' : ''}</span>`;
      list.appendChild(li);
    });
    const el = list.children[focus];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function save(mutate){
    const s = loadSettings();
    mutate(s);
    saveSettings(s);
    render();
    tickClock();
    renderTV();
  }

  function change(dir){
    const row = ROWS[focus];
    if (row.type === 'choice'){
      // preview only: city and method change every time on the mosque
      // screen, so they take effect on OK, not on a stray arrow press
      const opts = row.options();
      const cur = pending && pending.row === row ? pending.value : loadSettings()[row.key];
      const next = opts[(Math.max(0, opts.indexOf(cur)) + dir + opts.length) % opts.length];
      pending = next === loadSettings()[row.key] ? null : { row, value: next };
      savedRow = -1;
      render();
    } else if (row.type === 'adj'){
      save(s => { s.adjustments[row.key] = Math.max(row.min, Math.min(row.max, (s.adjustments[row.key] || 0) + dir)); });
    } else if (row.type === 'num'){
      save(s => { s[row.key] = Math.max(row.min, Math.min(row.max, (s[row.key] || 0) + dir)); });
    }
  }

  function activate(){
    const row = ROWS[focus];
    if (row.type === 'text') return startEdit();
    if (row.type === 'choice'){
      if (pending && pending.row === row){
        const { value } = pending; pending = null; savedRow = focus;
        save(s => { s[row.key] = value; });
      }
      return;
    }
    if (row.id === 'close') return close();
    if (row.id === 'reset'){
      if (!confirmReset){ confirmReset = true; render(); return; }
      confirmReset = false;
      save(s => { Object.assign(s, DEFAULT_SETTINGS, { adjustments: { ...DEFAULT_SETTINGS.adjustments } }); });
    }
  }

  function startEdit(){
    const input = list.children[focus].querySelector('.ts-input');
    editing = { input, row: ROWS[focus], before: input.value };
    list.children[focus].classList.add('editing');
    input.readOnly = false;
    input.focus();                       // shows the Android TV on-screen keyboard
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function endEdit(commit){
    const { input, row, before } = editing;
    editing = null;
    input.readOnly = true;
    input.blur();
    if (commit) save(s => { s[row.key] = input.value.trim().slice(0, row.max); });
    else { input.value = before; render(); }
  }

  function show(){
    open = true; focus = 0; confirmReset = false;
    render();
    panel.classList.add('open');
  }

  function close(){
    if (editing) endEdit(true);
    open = false; confirmReset = false; pending = null; savedRow = -1;
    panel.classList.remove('open');
  }

  function cancelHold(){
    clearTimeout(holdTimer); holdTimer = null;
    holdBar.classList.remove('holding');
  }

  function onKeyDown(e){
    if (!open){
      if (OK_KEYS.has(e.key) && !e.repeat && !holdTimer){
        holdBar.classList.add('holding');
        holdTimer = setTimeout(() => { cancelHold(); show(); }, HOLD_MS);
      }
      return;
    }
    if (editing){
      if (e.key === 'Enter'){ e.preventDefault(); endEdit(true); }
      else if (e.key === 'Escape'){ e.preventDefault(); endEdit(false); }
      return;                            // everything else types into the field
    }
    if (e.repeat && OK_KEYS.has(e.key)) return;   // still holding OK from opening
    const k = e.key;
    if (k === 'ArrowDown')      { focus = Math.min(ROWS.length - 1, focus + 1); confirmReset = false; pending = null; savedRow = -1; render(); }
    else if (k === 'ArrowUp')   { focus = Math.max(0, focus - 1); confirmReset = false; pending = null; savedRow = -1; render(); }
    else if (k === 'ArrowRight') change(+1);
    else if (k === 'ArrowLeft')  change(-1);
    else if (OK_KEYS.has(k))     activate();
    else if (BACK_KEYS.has(k))   close();
    else return;
    e.preventDefault();
  }

  function onKeyUp(e){
    if (OK_KEYS.has(e.key)) cancelHold();
  }

  document.addEventListener('DOMContentLoaded', () => {
    build();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', cancelHold);
  });

  // exposed for tests / a future Android "menu" key bridge
  window.tvSettings = { open: show, close };
})();
