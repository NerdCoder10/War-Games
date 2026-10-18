/* =====================================================================
   WARGAMES — interactive war-game tab
   ===================================================================== */

const WarGame = (() => {
  const DIPLO = [
    ['mediation', 'Seek UN / third-party mediation', 'Raises the chance of a negotiated ceasefire'],
    ['sanctions', 'Build a sanctions coalition', 'Drains the enemy economy over time (scales with your GDP)'],
    ['backchannel', 'Open back-channel talks', 'Secret negotiations — boosts ceasefire odds after week 3'],
    ['propaganda', 'Information & propaganda campaign', 'Props up home morale, erodes enemy morale'],
    ['armsAid', 'Request arms aid from partners', 'Steady resupply of munitions and equipment'],
    ['ceasefire', 'Seek a ceasefire at the first opportunity', 'Prefers a quick deal over total victory']
  ];
  const defaultSide = () => ({
    support: 65, vic: 'conventional', goal: 'major', posture: 'balanced',
    nuclear: { enabled: false, doctrine: 'last' },
    diplomacy: { mediation: false, sanctions: false, backchannel: false, propaganda: false, armsAid: false, ceasefire: false }
  });
  const S = {
    A: [], B: [], mode: 'A', surprise: 'none', editing: 'A',
    settings: { A: defaultSide(), B: defaultSide() },
    autoAllies: true, maxJoins: 8, scheduled: [],
    timeline: 'weekly', maxDays: 730, seed: 1,
    result: null, day: 0, playing: null
  };

  const PRESETS = [
    { id: 'custom', name: 'Custom (build your own)' },
    { id: 'taiwan', name: 'Taiwan Strait — China invades Taiwan', A: ['CHN'], B: ['TWN'], surprise: 'A', a: { goal: 'total', support: 70 }, b: { support: 75, diplomacy: { armsAid: true, propaganda: true } } },
    { id: 'pacific', name: 'Pacific War — China vs US, Japan & Taiwan', A: ['CHN'], B: ['TWN', 'USA', 'JPN'], surprise: 'A', a: { goal: 'major', nuclear: { enabled: true, doctrine: 'last' } }, b: { nuclear: { enabled: true, doctrine: 'last' }, diplomacy: { sanctions: true } } },
    { id: 'korea', name: 'Second Korean War', A: ['PRK'], B: ['KOR'], surprise: 'A', a: { goal: 'total', vic: 'total', support: 85, nuclear: { enabled: true, doctrine: 'early' } }, b: { support: 80 } },
    { id: 'baltic', name: 'Baltic flashpoint — Russia vs the Baltic states', A: ['RUS', 'BLR'], B: ['EST', 'LVA', 'LTU'], surprise: 'A', a: { goal: 'limited', vic: 'ruthless', nuclear: { enabled: true, doctrine: 'early' } }, b: { support: 80, goal: 'limited' } },
    { id: 'nato', name: 'Russia vs NATO (Europe)', A: ['RUS', 'BLR'], B: ['POL', 'DEU', 'GBR', 'FRA', 'USA'], surprise: 'A', a: { vic: 'ruthless', nuclear: { enabled: true, doctrine: 'early' } }, b: { goal: 'limited', nuclear: { enabled: true, doctrine: 'last' }, diplomacy: { sanctions: true } } },
    { id: 'indpak', name: 'India vs Pakistan', A: ['IND'], B: ['PAK'], surprise: 'none', a: { goal: 'limited', support: 80, nuclear: { enabled: true, doctrine: 'nfu' } }, b: { support: 85, nuclear: { enabled: true, doctrine: 'early' } } },
    { id: 'himalaya', name: 'China vs India (Himalayas)', A: ['CHN'], B: ['IND'], surprise: 'A', a: { goal: 'limited' }, b: { support: 80 } },
    { id: 'israeliran', name: 'Israel vs Iran', A: ['ISR'], B: ['IRN'], surprise: 'A', a: { goal: 'limited', support: 75 }, b: { support: 55 } },
    { id: 'usiran', name: 'United States vs Iran', A: ['USA'], B: ['IRN'], surprise: 'none', a: { goal: 'major', support: 45, diplomacy: { sanctions: true } }, b: { vic: 'ruthless' } },
    { id: 'usven', name: 'United States vs Venezuela', A: ['USA'], B: ['VEN'], surprise: 'A', a: { goal: 'total', support: 45 }, b: { support: 45 } },
    { id: 'guyana', name: 'Venezuela vs Guyana (Essequibo)', A: ['VEN'], B: ['GUY'], surprise: 'A', a: { goal: 'limited' } },
    { id: 'horn', name: 'Ethiopia vs Eritrea', A: ['ETH'], B: ['ERI'], surprise: 'none', a: { goal: 'limited', vic: 'ruthless' }, b: { vic: 'ruthless', support: 85 } },
    { id: 'aegean', name: 'Greece vs Turkey (Aegean)', A: ['TUR'], B: ['GRC', 'CYP'], surprise: 'none', a: { goal: 'limited' } },
    { id: 'maghreb', name: 'Morocco vs Algeria', A: ['DZA'], B: ['MAR'], surprise: 'none' },
    { id: 'congo', name: 'DR Congo vs Rwanda', A: ['RWA'], B: ['COD'], surprise: 'none', a: { goal: 'limited', vic: 'ruthless' } }
  ];

  let map, overlay;
  const name = iso => BY_ISO[iso].name;
  const fmt = Sim.fmt;

  /* ---------------- setup UI ---------------- */
  function init() {
    map = WorldMap.create('#wgMap', { onClick: onMapClick, isSelected: () => false, onResize: () => S.result && drawOverlay() });
    map.setTip(f => {
      const c = f.iso && BY_ISO[f.iso];
      if (!c) return `<b>${f.properties.name}</b>`;
      const side = sideOf(f.iso);
      return `<b>${c.name}</b>${side ? ` <span style="color:var(--${side.toLowerCase()})">· Side ${side}</span>` : ''}<br>Military ${Math.round(c.military)} · Power rank #${c.rank}${c.nukes ? '<br>☢ ' + c.nukes + ' warheads' : ''}<br><span class="muted">${S.mode === 'off' || S.result ? '' : 'Click to add to Side ' + S.mode}</span>`;
    });
    overlay = map.overlay;
    const defs = map.svg.append('defs');
    ['A', 'B'].forEach(k => defs.append('marker').attr('id', 'arrow' + k).attr('viewBox', '0 0 10 10').attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', k === 'A' ? '#3b82f6' : '#ef4444'));

    const sel = document.getElementById('preset');
    sel.innerHTML = PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    sel.onchange = () => loadPreset(sel.value);

    document.querySelectorAll('.mode-btn').forEach(b => (b.onclick = () => {
      S.mode = b.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(x => x.classList.toggle('active', x === b));
    }));
    document.querySelectorAll('.add-country').forEach(inp => {
      inp.addEventListener('change', () => {
        const iso = isoFromName(inp.value);
        if (iso) addTo(inp.dataset.side, iso);
        inp.value = '';
      });
    });
    document.getElementById('swapSides').onclick = () => {
      [S.A, S.B] = [S.B, S.A];
      [S.settings.A, S.settings.B] = [S.settings.B, S.settings.A];
      S.surprise = S.surprise === 'A' ? 'B' : S.surprise === 'B' ? 'A' : 'none';
      S.scheduled.forEach(x => (x.side = x.side === 'A' ? 'B' : 'A'));
      renderAll();
    };
    seg('surprise', v => (S.surprise = v));
    seg('sideSwitch', v => { S.editing = v; renderSideSettings(); });
    seg('timelineMode', v => { S.timeline = v; if (S.result) renderResults(); });
    const aa = document.getElementById('autoAllies');
    aa.onchange = () => (S.autoAllies = aa.checked);
    const mj = document.getElementById('maxJoins');
    mj.oninput = () => { S.maxJoins = +mj.value; document.getElementById('maxJoinsV').textContent = mj.value; };
    document.getElementById('maxDays').onchange = e => (S.maxDays = +e.target.value);
    const seed = document.getElementById('seed');
    seed.onchange = () => (S.seed = Math.max(1, +seed.value || 1));
    document.getElementById('reseed').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99999); seed.value = S.seed; };
    document.getElementById('schedAdd').onclick = () => {
      const iso = isoFromName(document.getElementById('schedCountry').value);
      const day = Math.max(1, +document.getElementById('schedDay').value || 1);
      if (!iso) return flash('schedCountry');
      S.scheduled.push({ iso, side: document.getElementById('schedSide').value, day });
      document.getElementById('schedCountry').value = '';
      renderSched();
    };
    document.getElementById('runSim').onclick = run;
    document.getElementById('runMC').onclick = runMonteCarlo;
    document.querySelectorAll('[data-collapse]').forEach(b => (b.onclick = () => {
      const p = document.getElementById(b.dataset.collapse);
      p.classList.toggle('collapsed');
      b.textContent = p.classList.contains('collapsed') ? '+' : '–';
    }));
    // Playback
    const scrub = document.getElementById('dayScrub');
    scrub.oninput = () => { stop(); setDay(+scrub.value); };
    document.getElementById('playBtn').onclick = () => (S.playing ? stop() : play());

    loadPreset('taiwan', true);
    setTimeout(() => focus([...S.A, ...S.B], 0), 50);
  }

  // Centre the globe on the belligerents and zoom, leaving room for the side panels
  function focus(isos, dur = 900) {
    const geo = WorldMap.geo;
    const pts = isos.map(i => geo.centroid[i]).filter(Boolean);
    if (!pts.length) return;
    const mid = pts.length === 1 ? pts[0] : d3.geoCentroid({ type: 'MultiPoint', coordinates: pts });
    map.setCenterLon(mid[0]);
    const wide = window.innerWidth > 760;
    const resultsOpen = !document.getElementById('wgResults').hidden;
    map.zoomTo(isos, dur, wide ? { l: 400, r: resultsOpen ? 440 : 10, t: 10, b: 80 } : {});
  }

  function seg(id, fn) {
    const el = document.getElementById(id);
    el.querySelectorAll('button').forEach(b => (b.onclick = () => {
      el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      fn(b.dataset.v);
    }));
  }
  function setSeg(id, v) {
    document.getElementById(id).querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  }
  function flash(id) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--b)';
    setTimeout(() => (el.style.borderColor = ''), 900);
  }
  function isoFromName(v) {
    v = (v || '').trim().toLowerCase();
    if (!v) return null;
    const c = COUNTRIES.find(c => c.name.toLowerCase() === v || c.iso.toLowerCase() === v) ||
      COUNTRIES.find(c => c.name.toLowerCase().startsWith(v));
    return c ? c.iso : null;
  }
  function sideOf(iso) {
    if (S.result) {
      const snap = currentSnap();
      if (snap.membersA.includes(iso)) return 'A';
      if (snap.membersB.includes(iso)) return 'B';
      return null;
    }
    return S.A.includes(iso) ? 'A' : S.B.includes(iso) ? 'B' : null;
  }

  function onMapClick(iso) {
    if (S.result) { clearResult(); }
    if (S.mode === 'off') return;
    const cur = sideOf(iso);
    if (cur === S.mode) remove(iso);
    else addTo(S.mode, iso);
  }
  function addTo(side, iso) {
    if (S.result) clearResult();
    remove(iso, true);
    S[side].push(iso);
    document.getElementById('preset').value = 'custom';
    renderAll();
  }
  function remove(iso, silent) {
    S.A = S.A.filter(x => x !== iso);
    S.B = S.B.filter(x => x !== iso);
    if (!silent) renderAll();
  }

  function loadPreset(id, quiet) {
    const p = PRESETS.find(x => x.id === id);
    if (!p || id === 'custom') return;
    clearResult();
    S.A = [...p.A]; S.B = [...p.B]; S.surprise = p.surprise || 'none';
    S.settings = { A: merge(defaultSide(), p.a), B: merge(defaultSide(), p.b) };
    S.scheduled = [];
    document.getElementById('preset').value = id;
    renderAll();
    if (!quiet) focus([...S.A, ...S.B]);
  }
  function merge(base, over) {
    if (!over) return base;
    for (const k of Object.keys(over)) {
      if (typeof over[k] === 'object' && !Array.isArray(over[k])) base[k] = { ...base[k], ...over[k] };
      else base[k] = over[k];
    }
    return base;
  }

  function prefill(a, b) {
    clearResult();
    S.A = [...a]; S.B = [...b];
    S.settings = { A: defaultSide(), B: defaultSide() };
    S.surprise = 'none'; S.scheduled = [];
    document.getElementById('preset').value = 'custom';
    App.go('#/wargame');
    renderAll();
    setTimeout(() => focus([...S.A, ...S.B]), 60);
  }

  function renderAll() {
    renderChips();
    renderSideSettings();
    setSeg('surprise', S.surprise);
    renderSched();
    paintSetup();
    updateShare();
  }

  function sidePower(list) {
    const p = list.reduce((t, i) => t + BY_ISO[i].power, 0);
    const n = list.reduce((t, i) => t + BY_ISO[i].nukes, 0);
    const tr = list.reduce((t, i) => t + BY_ISO[i].troops, 0);
    const g = list.reduce((t, i) => t + BY_ISO[i].gdp, 0);
    return { p, n, tr, g };
  }
  function renderChips() {
    ['A', 'B'].forEach(k => {
      const el = document.getElementById('chips' + k);
      el.innerHTML = S[k].map((iso, i) => `<span class="chip ${i === 0 ? 'lead' : ''}" title="${i === 0 ? 'Leader' : 'Click name to make leader'}"><span data-lead="${iso}">${i === 0 ? '★ ' : ''}${name(iso)}</span><button class="x" data-rm="${iso}">×</button></span>`).join('') || '<span class="muted small">Click the map or type below</span>';
      el.querySelectorAll('[data-rm]').forEach(b => (b.onclick = () => remove(b.dataset.rm)));
      el.querySelectorAll('[data-lead]').forEach(b => (b.onclick = () => { S[k] = [b.dataset.lead, ...S[k].filter(x => x !== b.dataset.lead)]; renderAll(); }));
    });
    const pa = sidePower(S.A), pb = sidePower(S.B), tot = pa.p + pb.p || 1;
    document.getElementById('powerA').innerHTML = S.A.length ? `power ${Math.round(100 * pa.p / tot)}% · ${fmt(pa.tr * 1000)} troops${pa.n ? ' · ☢' + pa.n : ''}` : '';
    document.getElementById('powerB').innerHTML = S.B.length ? `power ${Math.round(100 * pb.p / tot)}% · ${fmt(pb.tr * 1000)} troops${pb.n ? ' · ☢' + pb.n : ''}` : '';
  }

  function renderSideSettings() {
    const k = S.editing, st = S.settings[k], list = S[k];
    const hasNukes = list.some(i => BY_ISO[i].nukes > 0);
    const el = document.getElementById('sideSettings');
    el.innerHTML = `
      <div class="side-settings ${k.toLowerCase()}">
        <label class="field">Public support & national unification: <b id="supV">${st.support}%</b>
          <input type="range" min="5" max="100" value="${st.support}" id="ss_support">
          <span class="small">${st.support < 35 ? 'Deeply divided — anti-war movement, desertions likely' : st.support < 60 ? 'Lukewarm — support will erode as casualties mount' : st.support < 85 ? 'Solid backing for the war' : 'Total national unity, rally-around-the-flag'}</span>
        </label>
        <label class="field">Level of viciousness / rules of engagement
          <select id="ss_vic">
            ${Object.entries(Sim.VIC).map(([v, o]) => `<option value="${v}" ${st.vic === v ? 'selected' : ''}>${o.label}${{ restrained: ' — strict laws of war, minimise civilian harm', conventional: ' — standard military operations', ruthless: ' — strikes on infrastructure & cities', total: ' — no limits, civilians targeted' }[v]}</option>`).join('')}
          </select>
        </label>
        <label class="field">War aims
          <select id="ss_goal">
            <option value="limited" ${st.goal === 'limited' ? 'selected' : ''}>Limited — seize a border area / punish</option>
            <option value="major" ${st.goal === 'major' ? 'selected' : ''}>Major — take large territory, force concessions</option>
            <option value="total" ${st.goal === 'total' ? 'selected' : ''}>Total — conquest / regime change</option>
          </select>
        </label>
        <label class="field">Diplomatic posture
          <select id="ss_posture">
            <option value="dove" ${st.posture === 'dove' ? 'selected' : ''}>Dove — eager to negotiate</option>
            <option value="balanced" ${st.posture === 'balanced' ? 'selected' : ''}>Balanced</option>
            <option value="hawk" ${st.posture === 'hawk' ? 'selected' : ''}>Hawk — fight on, reject talks</option>
          </select>
        </label>
        <label class="check ${hasNukes ? '' : 'disabled'}" title="${hasNukes ? '' : 'No nuclear-armed state on this side'}">
          <input type="checkbox" id="ss_nuke" ${st.nuclear.enabled && hasNukes ? 'checked' : ''} ${hasNukes ? '' : 'disabled'}>
          <span>☢ Nuclear option on the table ${hasNukes ? '' : '<span class="muted">(side has no nuclear state)</span>'}</span>
        </label>
        ${hasNukes ? `<label class="field">Nuclear doctrine
          <select id="ss_doctrine" ${st.nuclear.enabled ? '' : 'disabled'}>
            <option value="nfu" ${st.nuclear.doctrine === 'nfu' ? 'selected' : ''}>No first use — retaliate only</option>
            <option value="last" ${st.nuclear.doctrine === 'last' ? 'selected' : ''}>Last resort — only if the state's survival is at stake</option>
            <option value="early" ${st.nuclear.doctrine === 'early' ? 'selected' : ''}>Escalate to de-escalate — use if losing</option>
          </select></label>` : ''}
        <div class="field">Diplomacy options</div>
        ${DIPLO.map(([key, label, tip]) => `<label class="check" title="${tip}"><input type="checkbox" data-dip="${key}" ${st.diplomacy[key] ? 'checked' : ''}> <span>${label}<br><span class="muted small">${tip}</span></span></label>`).join('')}
      </div>`;
    const bind = (id, fn, ev = 'change') => { const n = document.getElementById(id); if (n) n.addEventListener(ev, () => { fn(n); updateShare(); }); };
    bind('ss_support', n => { st.support = +n.value; document.getElementById('supV').textContent = n.value + '%'; }, 'input');
    bind('ss_support', () => renderSideSettings());
    bind('ss_vic', n => (st.vic = n.value));
    bind('ss_goal', n => (st.goal = n.value));
    bind('ss_posture', n => (st.posture = n.value));
    bind('ss_nuke', n => { st.nuclear.enabled = n.checked; renderSideSettings(); });
    bind('ss_doctrine', n => (st.nuclear.doctrine = n.value));
    el.querySelectorAll('[data-dip]').forEach(n => (n.onchange = () => (st.diplomacy[n.dataset.dip] = n.checked)));
    setSeg('sideSwitch', k);
  }

  function renderSched() {
    const ul = document.getElementById('schedList');
    ul.innerHTML = S.scheduled.map((x, i) => `<li><span><b style="color:var(--${x.side.toLowerCase()})">${name(x.iso)}</b> joins Side ${x.side} on day ${x.day}</span><button class="x chip" data-i="${i}" style="padding:0 6px;border:none;cursor:pointer;color:var(--muted)">×</button></li>`).join('');
    ul.querySelectorAll('[data-i]').forEach(b => (b.onclick = () => { S.scheduled.splice(+b.dataset.i, 1); renderSched(); }));
  }

  function paintSetup() {
    map.setFill(iso => (S.A[0] === iso ? '#2563eb' : S.A.includes(iso) ? '#3b82f6' : S.B[0] === iso ? '#dc2626' : S.B.includes(iso) ? '#ef4444' : null));
    if (!S.result) overlay.selectAll('*').remove();
  }

  function updateShare() {
    const q = new URLSearchParams({ a: S.A.join(','), b: S.B.join(','), s: S.surprise, seed: S.seed, t: S.timeline, d: S.maxDays });
    if (S.settings.A.nuclear.enabled) q.set('na', S.settings.A.nuclear.doctrine);
    if (S.settings.B.nuclear.enabled) q.set('nb', S.settings.B.nuclear.doctrine);
    const url = location.href.split('#')[0] + '#/wargame?' + q.toString();
    document.getElementById('shareRow').innerHTML = S.A.length && S.B.length ? `<a href="#" id="copyLink">🔗 Copy a link to this scenario</a>` : '';
    const cl = document.getElementById('copyLink');
    if (cl) cl.onclick = e => { e.preventDefault(); navigator.clipboard?.writeText(url); cl.textContent = '✓ Link copied'; };
  }
  function fromQuery(qs) {
    const q = new URLSearchParams(qs);
    const list = v => (v || '').split(',').filter(i => BY_ISO[i]);
    if (!q.get('a') || !q.get('b')) return;
    S.A = list(q.get('a')); S.B = list(q.get('b')).filter(i => !S.A.includes(i));
    S.settings = { A: defaultSide(), B: defaultSide() };
    S.surprise = ['A', 'B'].includes(q.get('s')) ? q.get('s') : 'none';
    S.seed = +q.get('seed') || 1; document.getElementById('seed').value = S.seed;
    if (q.get('t')) { S.timeline = q.get('t'); setSeg('timelineMode', S.timeline); }
    if (q.get('d')) { S.maxDays = +q.get('d'); document.getElementById('maxDays').value = S.maxDays; }
    if (q.get('na')) S.settings.A.nuclear = { enabled: true, doctrine: q.get('na') };
    if (q.get('nb')) S.settings.B.nuclear = { enabled: true, doctrine: q.get('nb') };
    document.getElementById('preset').value = 'custom';
    renderAll();
  }

  /* ---------------- running ---------------- */
  function config(seed) {
    return {
      sideA: { ...S.settings.A, members: S.A }, sideB: { ...S.settings.B, members: S.B },
      surprise: S.surprise, maxDays: S.maxDays, seed,
      expansion: { auto: S.autoAllies, max: S.maxJoins, scheduled: S.scheduled }
    };
  }
  function valid() {
    if (!S.A.length || !S.B.length) {
      alert('Pick at least one country for each side (click the map or type a name).');
      return false;
    }
    return true;
  }

  function run() {
    if (!valid()) return;
    stop();
    S.result = Sim.run(config(S.seed));
    S.day = 0;
    document.getElementById('wgResults').hidden = false;
    document.getElementById('playbar').hidden = false;
    const scrub = document.getElementById('dayScrub');
    scrub.max = S.result.days; scrub.value = 0;
    renderResults();
    focus([...S.A, ...S.B]);
    if (window.innerWidth < 760) document.getElementById('wgResults').scrollIntoView({ behavior: 'smooth' });
    setDay(0);
    play();
  }

  function runMonteCarlo() {
    if (!valid()) return;
    stop();
    const N = 300, out = { A: 0, B: 0, draw: 0, nuclear: 0, nukeUse: 0, days: [], cas: [], joins: {} };
    const body = document.getElementById('resBody');
    document.getElementById('wgResults').hidden = false;
    document.getElementById('resTitle').textContent = 'Odds (300 simulations)';
    let i = 0;
    const step = () => {
      const end = Math.min(N, i + 15);
      for (; i < end; i++) {
        const r = Sim.run(config(1000 + i * 7919));
        const o = r.outcome;
        if (o.kind === 'nuclear') out.nuclear++;
        else if (o.winner === 'A') out.A++;
        else if (o.winner === 'B') out.B++;
        else out.draw++;
        if (r.A.nukesUsed || r.B.nukesUsed) out.nukeUse++;
        out.days.push(r.days);
        out.cas.push(r.A.casMil + r.B.casMil + r.A.casCiv + r.B.casCiv);
        ['A', 'B'].forEach(k => r[k].members.forEach(m => { if (r[k].joined[m] > 0) out.joins[m + '|' + k] = (out.joins[m + '|' + k] || 0) + 1; }));
      }
      body.innerHTML = `<p class="muted">Running… ${i}/${N}</p>`;
      if (i < N) setTimeout(step, 0);
      else showMC(out, N);
    };
    step();
  }
  function showMC(o, N) {
    S.result = null;
    document.getElementById('playbar').hidden = true;
    paintSetup();
    const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const p = v => Math.round(100 * v / N);
    const joins = Object.entries(o.joins).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const aN = name(S.A[0]), bN = name(S.B[0]);
    document.getElementById('resBody').innerHTML = `
      <div class="mc-bar">
        <div style="width:${p(o.A)}%;background:var(--a)">${p(o.A) > 8 ? p(o.A) + '%' : ''}</div>
        <div style="width:${p(o.draw)}%;background:#64748b">${p(o.draw) > 8 ? p(o.draw) + '%' : ''}</div>
        <div style="width:${p(o.B)}%;background:var(--b)">${p(o.B) > 8 ? p(o.B) + '%' : ''}</div>
        <div style="width:${p(o.nuclear)}%;background:#a855f7">${p(o.nuclear) > 8 ? p(o.nuclear) + '%' : ''}</div>
      </div>
      <div class="stat-grid">
        <div class="a"><span>${aN} side comes out ahead</span><b>${p(o.A)}%</b></div>
        <div class="b"><span>${bN} side comes out ahead</span><b>${p(o.B)}%</b></div>
        <div><span>Draw / status quo</span><b>${p(o.draw)}%</b></div>
        <div><span>Mutual nuclear devastation</span><b>${p(o.nuclear)}%</b></div>
        <div><span>Any nuclear use</span><b>${p(o.nukeUse)}%</b></div>
        <div><span>Median length</span><b>${med(o.days)} days</b></div>
        <div><span>Median total casualties</span><b>${fmt(med(o.cas))}</b></div>
        <div><span>Worst 10% casualties</span><b>${fmt([...o.cas].sort((a, b) => a - b)[Math.floor(N * 0.9)])}</b></div>
      </div>
      <h3>Who joins the war (how often)</h3>
      ${joins.length ? joins.map(([k, v]) => { const [iso, s] = k.split('|'); return `<div class="barrow"><span style="color:var(--${s.toLowerCase()})">${name(iso)}</span><div class="track"><div class="fill" style="width:${p(v)}%;background:var(--${s.toLowerCase()})"></div></div><span class="val">${p(v)}%</span></div>`; }).join('') : '<p class="muted">No outside intervention in any run.</p>'}
      <p class="muted small" style="margin-top:12px">"Comes out ahead" = forced surrender, imposed peace, or holds more ground at ceasefire / end of timeline. Press <b>Run war</b> to watch a single detailed playthrough.</p>`;
  }

  function clearResult() {
    stop();
    S.result = null;
    document.getElementById('wgResults').hidden = true;
    document.getElementById('playbar').hidden = true;
    overlay.selectAll('*').remove();
    paintSetup();
  }

  /* ---------------- results ---------------- */
  function periods(r) {
    const mode = S.timeline, ev = r.events, out = [];
    const snapAt = d => r.snaps.find(s => s.day >= d) || r.snaps[r.snaps.length - 1];
    const push = (from, to, label) => {
      const items = ev.filter(e => e.day >= from && e.day <= to);
      out.push({ from, to, label, items, snap: snapAt(to) });
    };
    if (mode === 'headlines') {
      ev.filter(e => e.sev >= 2).forEach(e => out.push({ from: e.day, to: e.day, label: 'Day ' + e.day, items: [e], snap: snapAt(e.day), headline: true }));
      return out;
    }
    if (mode === 'phases') {
      let start = 0, ph = ev[0]?.phase || 'Opening';
      ev.forEach(e => {
        if (e.type === 'phase' && e.day > start) {
          push(start, e.day - 1, ph);
          start = e.day; ph = e.phase;
        }
      });
      push(start, r.days, ph);
      return out.filter(p => p.items.length);
    }
    const unit = mode === 'daily' ? 1 : mode === 'weekly' ? 7 : 30;
    let d = 0;
    while (d <= r.days) {
      const u = mode === 'daily' && d >= 30 ? 7 : unit;
      const to = Math.min(r.days, d + u - 1);
      const label = mode === 'daily' && d < 30 ? 'Day ' + d : mode === 'monthly' ? 'Month ' + (Math.floor(d / 30) + 1) : 'Week ' + (Math.floor(d / 7) + 1);
      push(d, to, label);
      d = to + 1;
    }
    return out;
  }

  function renderResults() {
    const r = S.result;
    const o = r.outcome;
    const aN = name(r.A.primary), bN = name(r.B.primary);
    const winName = o.winner ? name(r[o.winner].primary) : null;
    document.getElementById('resTitle').textContent = `${aN} vs ${bN}`;
    const ps = periods(r);
    const cls = o.kind === 'nuclear' ? 'nuclear' : o.winner === 'A' ? 'win-a' : o.winner === 'B' ? 'win-b' : '';
    const joinedA = r.A.members.filter(m => r.A.joined[m] > 0), joinedB = r.B.members.filter(m => r.B.joined[m] > 0);
    document.getElementById('resBody').innerHTML = `
      <div class="outcome ${cls}"><b>${o.kind === 'nuclear' ? '☢ NUCLEAR CATASTROPHE' : winName ? winName + ' prevails' : 'No clear winner'}</b> — after <b>${r.days} days</b>.<br>${o.text}</div>
      <div class="stat-grid">
        <div class="a"><span>${aN} side — military casualties</span><b>${fmt(r.A.casMil)}</b></div>
        <div class="b"><span>${bN} side — military casualties</span><b>${fmt(r.B.casMil)}</b></div>
        <div class="a"><span>Civilian deaths (side A territory)</span><b>${fmt(r.A.casCiv)}</b></div>
        <div class="b"><span>Civilian deaths (side B territory)</span><b>${fmt(r.B.casCiv)}</b></div>
        <div class="a"><span>Economic capacity lost</span><b>${Math.round(100 - r.A.econ)}%</b></div>
        <div class="b"><span>Economic capacity lost</span><b>${Math.round(100 - r.B.econ)}%</b></div>
        <div class="a"><span>Forces remaining / morale</span><b>${Math.round(r.A.str * 100)}% · ${Math.round(r.A.morale)}</b></div>
        <div class="b"><span>Forces remaining / morale</span><b>${Math.round(r.B.str * 100)}% · ${Math.round(r.B.morale)}</b></div>
      </div>
      <div class="muted small" style="margin-top:6px">Theatre type: <b>${{ land: 'Land war (shared border)', amphibious: 'Amphibious / maritime war', standoff: 'Long-range standoff war (missiles, air & naval)' }[r.warType]}</b>${r.A.nukesUsed + r.B.nukesUsed ? ` · ☢ nuclear strikes: ${r.A.nukesUsed + r.B.nukesUsed}` : ''}</div>
      ${joinedA.length || joinedB.length ? `<h3>Countries that joined</h3>
        ${joinedA.map(m => `<span class="tag" style="color:#93c5fd">${name(m)} · day ${r.A.joined[m]}</span>`).join('')}
        ${joinedB.map(m => `<span class="tag" style="color:#fca5a5">${name(m)} · day ${r.B.joined[m]}</span>`).join('')}` : ''}
      <h3>Strength & morale over time</h3>
      <svg class="chart" id="resChart"></svg>
      <h3>Timeline — ${{ daily: 'day by day', weekly: 'week by week', monthly: 'month by month', phases: 'by phase', headlines: 'headlines' }[S.timeline]}</h3>
      <div id="tl">${ps.map((p, i) => `
        <div class="tl-card" data-to="${p.to}" data-i="${i}">
          <div class="when">${p.label}<span>${p.headline ? '' : p.from === p.to ? 'day ' + p.from : 'days ' + p.from + '–' + p.to}</span></div>
          ${p.items.length ? `<ul>${p.items.filter(e => e.type !== 'phase' || S.timeline !== 'phases').map(e => `<li class="sev${e.sev} side-${e.side || ''}">${e.text}</li>`).join('')}</ul>` : ''}
          ${p.headline ? '' : `<div class="sum">${summaryLine(p.snap, r)}</div>`}
        </div>`).join('')}</div>
      <div class="run-row"><button class="btn" id="againBtn">🎲 Same setup, new roll</button><button class="btn" id="editBtn">Edit scenario</button></div>`;
    document.querySelectorAll('#tl .tl-card').forEach(c => (c.onclick = () => { stop(); setDay(+c.dataset.to); }));
    document.getElementById('againBtn').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99999); document.getElementById('seed').value = S.seed; run(); };
    document.getElementById('editBtn').onclick = clearResult;
    drawChart();
  }
  function summaryLine(s, r) {
    if (!s) return '';
    const aN = name(r.A.primary), bN = name(r.B.primary);
    const held = Math.abs(s.front) < 2 ? 'Front near the pre-war line' :
      r.warType === 'standoff' ? `${s.front > 0 ? aN : bN} has the upper hand (${Math.round(Math.abs(s.front))}%)` :
        `${s.front > 0 ? aN : bN} holds ${Math.round(Math.abs(s.front))}% of the contested zone`;
    return `${held} · casualties ${fmt(s.casMilA + s.casMilB + s.casCivA + s.casCivB)} · forces ${Math.round(s.strA * 100)}% / ${Math.round(s.strB * 100)}%`;
  }

  function drawChart() {
    const r = S.result, svg = d3.select('#resChart');
    const w = svg.node().clientWidth || 380, h = 130, m = { l: 26, r: 6, t: 6, b: 18 };
    svg.attr('viewBox', `0 0 ${w} ${h}`).html('');
    const x = d3.scaleLinear([0, Math.max(1, r.days)], [m.l, w - m.r]);
    const y = d3.scaleLinear([0, 100], [h - m.b, m.t]);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => 'd' + d));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3));
    const line = f => d3.line().x(d => x(d.day)).y(d => y(Math.min(100, f(d))))(r.snaps);
    svg.append('path').attr('d', line(d => d.strA * 100)).attr('stroke', '#3b82f6').attr('fill', 'none').attr('stroke-width', 2);
    svg.append('path').attr('d', line(d => d.strB * 100)).attr('stroke', '#ef4444').attr('fill', 'none').attr('stroke-width', 2);
    svg.append('path').attr('d', line(d => d.moraleA)).attr('stroke', '#3b82f6').attr('fill', 'none').attr('stroke-dasharray', '3 3').attr('opacity', .7);
    svg.append('path').attr('d', line(d => d.moraleB)).attr('stroke', '#ef4444').attr('fill', 'none').attr('stroke-dasharray', '3 3').attr('opacity', .7);
    svg.append('line').attr('id', 'chartCursor').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', '#f5a524');
    svg.append('text').attr('x', w - m.r).attr('y', 12).attr('text-anchor', 'end').text('— forces   - - morale');
    svg.node().__x = x;
  }

  /* ---------------- playback ---------------- */
  function currentSnap() {
    const r = S.result;
    return r.snaps.find(s => s.day >= S.day) || r.snaps[r.snaps.length - 1];
  }
  function setDay(d) {
    const r = S.result;
    if (!r) return;
    S.day = Math.max(0, Math.min(r.days, d));
    document.getElementById('dayScrub').value = S.day;
    const snap = currentSnap();
    document.getElementById('dayLabel').textContent = 'Day ' + S.day;
    const fa = 50 + snap.front / 2;
    document.getElementById('frontA').style.width = fa + '%';
    document.getElementById('frontLbl').textContent = Math.abs(snap.front) < 1 ? 'Even' : (snap.front > 0 ? name(r.A.primary) : name(r.B.primary)) + ' +' + Math.round(Math.abs(snap.front)) + '%';
    map.setFill(iso => {
      if (iso === r.A.primary) return '#2563eb';
      if (iso === r.B.primary) return '#dc2626';
      if (snap.membersA.includes(iso)) return r.A.joined[iso] > 0 ? '#60a5fa' : '#3b82f6';
      if (snap.membersB.includes(iso)) return r.B.joined[iso] > 0 ? '#f87171' : '#ef4444';
      return null;
    });
    drawOverlay();
    const cur = d3.select('#chartCursor');
    const x = d3.select('#resChart').node()?.__x;
    if (x) cur.attr('x1', x(S.day)).attr('x2', x(S.day));
    document.querySelectorAll('#tl .tl-card').forEach(c => c.classList.remove('current'));
    const cards = [...document.querySelectorAll('#tl .tl-card')];
    const card = cards.find(c => +c.dataset.to >= S.day);
    if (card) {
      card.classList.add('current');
      if (S.playing) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function drawOverlay() {
    const r = S.result;
    if (!r) return;
    overlay.selectAll('*').remove();
    const P = c => map.projection(c);
    const geo = WorldMap.geo;
    const k = map.k;
    const init = r.initiator === 'A' ? r.A : r.B, def = r.initiator === 'A' ? r.B : r.A;
    const p1 = P(geo.centroid[init.primary]), p2 = P(geo.centroid[def.primary]);
    if (p1 && p2) {
      const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2 - Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.18;
      overlay.append('path').attr('class', 'attack-arc')
        .attr('d', `M${p1[0]},${p1[1]} Q${mx},${my} ${p2[0]},${p2[1]}`)
        .attr('stroke', r.initiator === 'A' ? '#3b82f6' : '#ef4444').attr('marker-end', `url(#arrow${r.initiator})`)
        .attr('stroke-width', 2.2 / k).attr('stroke-dasharray', `${6 / k} ${4 / k}`);
    }
    const t = P(r.theater);
    if (t) overlay.append('circle').attr('class', 'theater').attr('cx', t[0]).attr('cy', t[1]).attr('r', 18 / k).attr('stroke-width', 1 / k);
    const recent = S.timeline === 'monthly' ? 30 : S.timeline === 'daily' ? 3 : 7;
    const evs = r.events.filter(e => e.loc && e.day <= S.day);
    evs.forEach(e => {
      const p = P(e.loc);
      if (!p) return;
      const g = overlay.append('g').attr('class', 'scale-k').attr('data-t', `translate(${p[0]},${p[1]})`).attr('transform', `translate(${p[0]},${p[1]}) scale(${1 / k})`);
      const nuke = e.type === 'nuclear';
      const isRecent = S.day - e.day <= recent;
      g.append('circle').attr('class', 'ev-dot ' + (nuke ? 'nuclear' : e.side || '')).attr('r', nuke ? 7 : e.sev >= 3 ? 5 : 3.5).attr('opacity', isRecent ? 1 : 0.45);
      if (isRecent) {
        const ring = g.append('circle').attr('class', 'ev-ring' + (nuke ? ' nuclear' : '')).attr('r', 4);
        ring.transition().duration(1400).ease(d3.easeCubicOut).attr('r', nuke ? 40 : 18).style('opacity', 0).remove();
      }
      g.append('title').text(`Day ${e.day}: ${e.text.replace(/<[^>]+>/g, '')}`);
    });
    [r.A.primary, r.B.primary].forEach(iso => {
      const p = P(geo.centroid[iso]);
      if (p) overlay.append('g').attr('class', 'scale-k').attr('data-t', `translate(${p[0]},${p[1]})`).attr('transform', `translate(${p[0]},${p[1]}) scale(${1 / k})`)
        .append('text').attr('class', 'cap-label').attr('text-anchor', 'middle').attr('dy', -8).text(name(iso));
    });
  }

  function play() {
    const r = S.result;
    if (!r) return;
    if (S.day >= r.days) S.day = 0;
    document.getElementById('playBtn').textContent = '⏸';
    const stepDays = Math.max(1, Math.round(r.days / 120));
    S.playing = setInterval(() => {
      if (S.day >= r.days) return stop();
      setDay(S.day + stepDays);
    }, 110);
  }
  function stop() {
    if (S.playing) clearInterval(S.playing);
    S.playing = null;
    const b = document.getElementById('playBtn');
    if (b) b.textContent = '▶';
  }

  return { init, prefill, fromQuery, stop };
})();
