/* =====================================================================
   WARGAMES — Global Analysis & Rankings tabs
   ===================================================================== */

const Analysis = (() => {
  const METRICS = [
    { key: 'warRisk', label: 'War likelihood', scale: d3.interpolateYlOrRd, fmt: v => v + '%', desc: 'Probability of an interstate armed clash within 10 years' },
    { key: 'fullWarRisk', label: 'Full-scale war', scale: d3.interpolateOrRd, fmt: v => v + '%', desc: 'Probability of a full-scale interstate war within 10 years', max: 60 },
    { key: 'national', label: 'National power', scale: d3.interpolateViridis, desc: 'Composite comprehensive national power' },
    { key: 'military', label: 'Military strength', scale: d3.interpolateReds, desc: 'Spending, manpower, technology and nuclear forces' },
    { key: 'econ', label: 'Economic strength', scale: d3.interpolateGreens, desc: 'Economic size and wealth per person' },
    { key: 'soft', label: 'Soft power', scale: d3.interpolatePurples, desc: 'Cultural, diplomatic and reputational pull' },
    { key: 'pat', label: 'Patriotism', scale: d3.interpolateOranges, desc: 'National pride & willingness to fight for the country' },
    { key: 'intel', label: 'Intelligence', scale: d3.interpolateBlues, desc: 'Reach and capability of intelligence agencies' },
    { key: 'vic', label: 'Ruthlessness', scale: d3.interpolateRdPu, desc: 'Willingness to use extreme force & disregard for laws of war' },
    { key: 'rev', label: 'Revisionism', scale: d3.interpolateYlOrBr, desc: 'Desire to change borders or the regional order' },
    { key: 'stab', label: 'Stability', scale: d3.interpolateGnBu, desc: 'Political & state stability' },
    { key: 'democracy', label: 'Democracy', scale: d3.interpolateCividis, desc: 'Democratic governance (0 authoritarian – 100 full democracy)' },
    { key: 'internalRisk', label: 'Internal conflict risk', scale: d3.interpolateYlOrRd, desc: 'Risk of civil war, insurgency or coup' }
  ];
  let metric = METRICS[0], map, selected = null;
  const fmtN = (v, d = 0) => v >= 1000 ? d3.format(',.0f')(v) : d3.format(`,.${d}f`)(v);
  const pct = v => (v * 100 >= 1 ? Math.round(v * 100) : (v * 100).toFixed(1)) + '%';
  const govType = d => (d >= 8 ? 'Full democracy' : d >= 6 ? 'Flawed democracy' : d >= 4 ? 'Hybrid regime' : 'Authoritarian');
  const name = iso => BY_ISO[iso].name;

  function colorFor(c) {
    const v = c[metric.key];
    const max = metric.max || (metric.key.includes('Risk') ? 100 : 100);
    return metric.scale(0.08 + 0.92 * Math.min(1, v / max));
  }

  function init() {
    const pills = d3.select('#metricPills');
    pills.selectAll('button').data(METRICS).join('button')
      .attr('class', d => 'pill' + (d === metric ? ' active' : ''))
      .attr('title', d => d.desc)
      .text(d => d.label)
      .on('click', (ev, d) => { metric = d; pills.selectAll('button').classed('active', x => x === d); paint(); });

    map = WorldMap.create('#analysisMap', {
      onClick: iso => App.go('#/country/' + iso),
      isSelected: iso => iso === selected
    });
    map.setTip(f => {
      const c = f.iso && BY_ISO[f.iso];
      if (!c) return `<b>${f.properties.name}</b><br><span class="muted">Disputed / no data</span>`;
      const terr = BY_NUM[f.id] ? '' : `<span class="muted">${f.properties.name} — territory of</span><br>`;
      return `${terr}<b>${c.name}</b><br>${metric.label}: <b>${metric.fmt ? metric.fmt(Math.round(c[metric.key])) : Math.round(c[metric.key])}</b><br><span class="muted">Most likely adversary: ${c.topRival ? name(c.topRival) : '—'}</span>`;
    });
    document.getElementById('analysisReset').onclick = () => map.resetZoom();
    paint();
    renderHotspots();
    renderDossier(null);
    renderRankings();
  }

  function paint() {
    map.setFill(iso => colorFor(BY_ISO[iso]));
    const lg = d3.select('#legend').html('');
    const max = metric.max || 100;
    lg.append('div').html(`<b>${metric.label}</b>`);
    const stops = d3.range(0, 1.01, 0.1).map(t => metric.scale(0.08 + 0.92 * t)).join(',');
    lg.append('div').attr('class', 'bar').style('background', `linear-gradient(90deg, ${stops})`);
    lg.append('div').attr('class', 'ticks').html(`<span>0</span><span>${max / 2}</span><span>${max}${metric.fmt ? '%' : ''}</span>`);
  }

  function renderHotspots() {
    const hs = Model.globalHotspots(18);
    d3.select('#hotspots').selectAll('div').data(hs).join('div').attr('class', 'hotspot')
      .html(d => `
        <div class="pair">${name(d.a)} <span class="muted">vs</span> ${name(d.b)}</div>
        <div class="nums">clash ${pct(d.clash10)} · war ${pct(d.war10)}</div>
        <div class="why">${d.type}${d.note ? ' — ' + d.note : ''}</div>
        <div class="prob-bar"><div style="width:${d.war10 * 100}%;background:var(--b)"></div><div style="width:${(d.clash10 - d.war10) * 100}%;background:var(--accent)"></div></div>`)
      .on('click', (ev, d) => App.go('#/country/' + d.a));
  }

  function bar(label, v, color, title = '') {
    return `<div class="barrow" title="${title}"><span>${label}</span><div class="track"><div class="fill" style="width:${Math.max(1, v)}%;background:${color}"></div></div><span class="val">${Math.round(v)}</span></div>`;
  }

  function renderDossier(iso) {
    selected = iso;
    map && map.refresh();
    const el = document.getElementById('dossier');
    if (!iso) {
      const top = [...COUNTRIES].sort((a, b) => b.national - a.national).slice(0, 10);
      el.innerHTML = `
        <h2>World overview</h2>
        <div class="sub">${COUNTRIES.length} countries analysed · click any country on the map</div>
        <div class="note">Colour the map with the buttons above. Every country gets a full dossier: military, economy, soft power, patriotism, intelligence, ruthlessness, stability — plus a war-likelihood forecast naming its most likely adversaries.</div>
        <h3>Top 10 by national power</h3>
        ${top.map((c, i) => `<div class="adv" data-iso="${c.iso}"><div class="top"><span>${i + 1}. <b>${c.name}</b></span><span class="mono">${Math.round(c.national)}</span></div></div>`).join('')}
        <h3>Nuclear-armed states</h3>
        <div>${COUNTRIES.filter(c => c.nukes > 0).sort((a, b) => b.nukes - a.nukes).map(c => `<span class="tag">${c.name} · ${fmtN(c.nukes)}</span>`).join('')}</div>`;
      el.querySelectorAll('[data-iso]').forEach(n => (n.onclick = () => App.go('#/country/' + n.dataset.iso)));
      return;
    }
    const c = BY_ISO[iso];
    const o = Model.outlook(iso);
    const top = o.top.filter(d => d.clash10 > 0.005).slice(0, 6);
    const rival = top[0];
    const allies = rival ? Model.likelyAllies(iso, rival.other) : [];
    const als = Model.alliancesOf(iso);
    const tagClass = p => (p > 0.3 ? 'hot' : p > 0.08 ? 'warm' : '');
    el.innerHTML = `
      <h2>${c.name}</h2>
      <div class="sub">${REGIONS[c.region]} · ${govType(c.dem)} · National power rank <b>#${c.rank}</b> · Military rank <b>#${c.milRank}</b></div>
      <div class="kv">
        <div><span>Population</span><b>${c.pop >= 1 ? fmtN(c.pop, 1) + 'M' : fmtN(c.pop * 1000) + 'k'}</b></div>
        <div><span>GDP</span><b>$${c.gdp >= 1000 ? (c.gdp / 1000).toFixed(1) + 'T' : fmtN(c.gdp, c.gdp < 10 ? 1 : 0) + 'B'}</b></div>
        <div><span>GDP / person</span><b>$${fmtN(c.gdpPc)}</b></div>
        <div><span>Defence budget</span><b>$${fmtN(c.mil, c.mil < 10 ? 1 : 0)}B</b></div>
        <div><span>% of GDP</span><b>${c.milPctGdp.toFixed(1)}%</b></div>
        <div><span>Active troops</span><b>${fmtN(c.troops)}k</b></div>
        <div><span>Reserves</span><b>${fmtN(c.reserves)}k</b></div>
        <div><span>Nuclear warheads</span><b>${c.nukes ? fmtN(c.nukes) : (iso === 'IRN' ? 'threshold' : '0')}</b></div>
        <div><span>Power reach</span><b>${fmtN(c.reach)} km</b></div>
      </div>
      ${c.note ? `<div class="note">${c.note}</div>` : ''}
      <h3>Strength profile (0–100)</h3>
      <div class="bars">
        ${bar('National power', c.national, '#a3e635')}
        ${bar('Military strength', c.military, '#ef4444')}
        ${bar('Military technology', c.tech, '#f97316')}
        ${bar('Economic strength', c.econ, '#22c55e')}
        ${bar('Soft power', c.soft, '#a855f7')}
        ${bar('Patriotism', c.pat, '#f59e0b', 'National pride & willingness to fight')}
        ${bar('Intelligence agencies', c.intel, '#3b82f6')}
        ${bar('Ruthlessness', c.vic, '#ec4899', 'Willingness to use extreme force / disregard laws of war')}
        ${bar('Revisionism', c.rev, '#eab308', 'Desire to change borders or the order')}
        ${bar('National cohesion', c.cohesion, '#14b8a6')}
        ${bar('Political stability', c.stab, '#06b6d4')}
        ${bar('Democracy', c.democracy, '#94a3b8')}
      </div>
      <h3>War outlook — next 10 years</h3>
      <div class="risk-head">
        <div><b style="color:${d3.interpolateYlOrRd(0.2 + 0.8 * o.anyClash)}">${pct(o.anyClash)}</b><span>any interstate armed clash</span></div>
        <div><b style="color:${d3.interpolateOrRd(0.3 + 0.7 * Math.min(1, o.anyWar * 1.6))}">${pct(o.anyWar)}</b><span>full-scale war</span></div>
        <div><b>${Math.round(c.internalRisk)}%</b><span>internal conflict / coup risk</span></div>
      </div>
      ${rival ? `<div class="note">Most likely adversary: <b>${name(rival.other)}</b> — ${rival.type.toLowerCase()}.${rival.note ? ' ' + rival.note + '.' : ''}</div>` : '<div class="note">No meaningful interstate war risk detected.</div>'}
      ${top.map(d => `
        <div class="adv" data-other="${d.other}">
          <div class="top"><b>${name(d.other)}</b><span class="mono"><span class="tag ${tagClass(d.clash10)}">clash ${pct(d.clash10)}</span><span class="tag ${tagClass(d.war10 * 2)}">war ${pct(d.war10)}</span></span></div>
          <div class="why">${d.drivers.slice(0, 4).join(' · ')}</div>
        </div>`).join('')}
      ${rival ? `<button class="btn primary" id="simRival" style="width:100%;margin-top:6px">Simulate a war: ${c.name} vs ${name(rival.other)} →</button>` : ''}
      ${allies.length ? `<h3>Likely to side with ${c.name}${rival ? ' vs ' + name(rival.other) : ''}</h3><div>${allies.map(a => `<span class="tag">${name(a.iso)}</span>`).join('')}</div>` : ''}
      ${als.length ? `<h3>Alliances & alignments</h3><div>${als.map(a => `<span class="tag">${a.name}</span>`).join('')}</div>` : ''}
    `;
    el.querySelectorAll('[data-other]').forEach(n => (n.onclick = () => WarGame.prefill([iso], [n.dataset.other])));
    const b = el.querySelector('#simRival');
    if (b) b.onclick = () => WarGame.prefill([iso], [rival.other]);
    el.scrollTop = 0;
  }

  function showCountry(iso) {
    renderDossier(iso);
    map.zoomTo([iso]);
    document.getElementById('countrySearch').value = '';
  }

  /* ---------- Rankings ---------- */
  const COLS = [
    { k: 'rank', l: '#', num: true },
    { k: 'name', l: 'Country' },
    { k: 'region', l: 'Region', f: v => REGIONS[v] },
    { k: 'national', l: 'Power', num: true, bar: '#a3e635' },
    { k: 'military', l: 'Military', num: true, bar: '#ef4444' },
    { k: 'econ', l: 'Economy', num: true, bar: '#22c55e' },
    { k: 'soft', l: 'Soft pwr', num: true },
    { k: 'pat', l: 'Patriotism', num: true },
    { k: 'intel', l: 'Intel', num: true },
    { k: 'vic', l: 'Ruthless', num: true },
    { k: 'stab', l: 'Stability', num: true },
    { k: 'warRisk', l: 'War risk', num: true, f: v => v + '%', bar: '#f5a524' },
    { k: 'topRival', l: 'Likeliest foe', f: v => (v ? BY_ISO[v].name : '—') },
    { k: 'mil', l: 'Budget $B', num: true, f: v => fmtN(v, v < 10 ? 1 : 0) },
    { k: 'troops', l: 'Troops k', num: true, f: v => fmtN(v) },
    { k: 'nukes', l: 'Nukes', num: true, f: v => (v ? fmtN(v) : '') },
    { k: 'gdp', l: 'GDP $B', num: true, f: v => fmtN(v, v < 10 ? 1 : 0) },
    { k: 'pop', l: 'Pop M', num: true, f: v => fmtN(v, 1) }
  ];
  let sortK = 'rank', sortDir = 1;
  function renderRankings() {
    const t = d3.select('#rankTable');
    const q = (document.getElementById('rankFilter').value || '').toLowerCase();
    const rows = COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q) || REGIONS[c.region].toLowerCase().includes(q))
      .sort((a, b) => {
        const x = a[sortK], y = b[sortK];
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortDir;
      });
    t.html('');
    t.append('thead').append('tr').selectAll('th').data(COLS).join('th')
      .attr('class', d => (d.k === sortK ? 'sorted' : ''))
      .text(d => d.l + (d.k === sortK ? (sortDir > 0 ? ' ↑' : ' ↓') : ''))
      .on('click', (ev, d) => {
        if (sortK === d.k) sortDir *= -1; else { sortK = d.k; sortDir = d.num && d.k !== 'rank' ? -1 : 1; }
        renderRankings();
      });
    const tr = t.append('tbody').selectAll('tr').data(rows).join('tr').on('click', (ev, c) => App.go('#/country/' + c.iso));
    tr.selectAll('td').data(c => COLS.map(col => ({ col, v: c[col.k] }))).join('td')
      .attr('class', d => (d.col.num ? 'num' : ''))
      .html(d => {
        const txt = d.col.f ? d.col.f(d.v) : typeof d.v === 'number' ? Math.round(d.v) : d.v;
        return d.col.bar ? `${txt}<span class="cell-bar" style="width:${Math.max(1, d.v) * 0.5}px;background:${d.col.bar}"></span>` : txt;
      });
  }

  return { init, showCountry, renderDossier, renderRankings, METRICS };
})();
