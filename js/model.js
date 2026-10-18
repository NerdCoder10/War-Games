/* =====================================================================
   WARGAMES — analysis model
   Builds composite indices for each country and a dyadic war-risk
   estimate for every pair of countries.
   ===================================================================== */

const Model = (() => {
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const logNorm = (v, max) => (v <= 0 ? 0 : Math.log10(1 + v) / Math.log10(1 + max));

  let geo = null;      // { centroid: {iso:[lon,lat]}, neighbors: {iso:Set} }
  const dyadCache = new Map();

  /* ---------- per-country indices ---------- */
  function computeIndices() {
    const maxMil = Math.max(...COUNTRIES.map(c => c.mil));
    const maxTroops = Math.max(...COUNTRIES.map(c => c.troops));
    const maxRes = Math.max(...COUNTRIES.map(c => c.reserves));
    const maxGdp = Math.max(...COUNTRIES.map(c => c.gdp));
    const pcs = COUNTRIES.map(c => (c.pop > 0 ? c.gdp * 1000 / c.pop : 0));
    const maxPc = Math.max(...pcs);

    COUNTRIES.forEach((c, i) => {
      c.gdpPc = pcs[i];                               // $ per person
      c.milPctGdp = c.gdp > 0 ? (c.mil / c.gdp) * 100 : 0;
      const nukeScore = c.nukes > 0 ? 0.45 + 0.55 * logNorm(c.nukes, 5500) : 0;
      const conv =
        0.42 * logNorm(c.mil, maxMil) ** 1.6 +
        0.18 * logNorm(c.troops, maxTroops) +
        0.06 * logNorm(c.reserves, maxRes) +
        0.34 * (c.tech / 100) ** 1.4;
      c.milRaw = conv * 0.85 + nukeScore * 0.15;
      c.econ = clamp(100 * (0.7 * logNorm(c.gdp, maxGdp) ** 1.5 + 0.3 * logNorm(c.gdpPc, maxPc)));
      c.cohesion = clamp(0.6 * c.pat + 0.4 * c.stab);
      c.democracy = c.dem * 10;
      // Effective combat power (absolute, not normalised) for simulations
      c.power = Math.pow(c.mil + 0.5, 0.55) * (0.4 + c.tech / 100) * Math.pow(c.troops + c.reserves * 0.15 + 1, 0.3);
    });
    const maxMilRaw = Math.max(...COUNTRIES.map(c => c.milRaw));
    COUNTRIES.forEach(c => {
      c.military = clamp(100 * c.milRaw / maxMilRaw);
      c.national = clamp(0.4 * c.military + 0.3 * c.econ + 0.1 * c.soft + 0.1 * c.intel + 0.1 * c.cohesion);
      // Power-projection reach in km
      c.reach = 400 + 16000 * Math.pow(c.military / 100, 2.6) + (c.nukes > 100 ? 2500 : 0);
      // Internal conflict / instability risk (anocracies & fragile states highest)
      const anocracy = 1 - Math.abs(c.dem - 4.5) / 5.5;
      c.internalRisk = clamp(100 * (0.62 * (1 - c.stab / 100) ** 1.3 + 0.18 * anocracy + 0.2 * (c.vic / 100) * (1 - c.stab / 100)));
    });
    const ranked = [...COUNTRIES].sort((a, b) => b.national - a.national);
    ranked.forEach((c, i) => (c.rank = i + 1));
    const milRanked = [...COUNTRIES].sort((a, b) => b.military - a.military);
    milRanked.forEach((c, i) => (c.milRank = i + 1));
  }

  /* ---------- relationships ---------- */
  const rivalryMap = new Map();
  RIVALRIES.forEach(([a, b, t, note, active]) => {
    rivalryMap.set(a + '|' + b, { t, note, active: !!active });
    rivalryMap.set(b + '|' + a, { t, note, active: !!active });
  });
  function rivalry(a, b) { return rivalryMap.get(a + '|' + b) || null; }

  const allianceCache = new Map();
  function alliance(a, b) {
    const key = a + '|' + b;
    if (allianceCache.has(key)) return allianceCache.get(key);
    let best = 0, name = null;
    for (const al of ALLIANCES) {
      if (al.s > best && al.members.includes(a) && al.members.includes(b)) { best = al.s; name = al.name; }
    }
    const res = { s: best, name };
    allianceCache.set(key, res);
    return res;
  }
  function alliancesOf(iso) { return ALLIANCES.filter(a => a.members.includes(iso)); }

  function setGeo(g) { geo = g; dyadCache.clear(); }
  function distanceKm(a, b) {
    const pa = geo?.centroid[a], pb = geo?.centroid[b];
    if (!pa || !pb) return 8000;
    return d3.geoDistance(pa, pb) * 6371;
  }
  function contiguous(a, b) { return !!(geo && geo.neighbors[a] && geo.neighbors[a].has(b)); }

  /* ---------- dyadic risk ---------- */
  function dyad(aIso, bIso) {
    const key = aIso < bIso ? aIso + '|' + bIso : bIso + '|' + aIso;
    if (dyadCache.has(key)) return dyadCache.get(key);
    const A = BY_ISO[aIso], B = BY_ISO[bIso];
    const r = rivalry(aIso, bIso);
    const T = r ? r.t : 0;
    const dist = distanceKm(aIso, bIso);
    const land = contiguous(aIso, bIso);
    // Gap between country edges, approximated from centroid distance and size
    const gap = dist - 0.6 * ((geo?.radius[aIso] || 50) + (geo?.radius[bIso] || 50));
    const near = land || gap < 700;
    const al = alliance(aIso, bIso);
    const drivers = [];

    let opp;
    if (land) opp = 1;
    else if (near) opp = 0.75;
    else if (dist < Math.max(A.reach, B.reach)) opp = 0.22 + 0.7 * T ** 3;
    else opp = 0.02;

    const agg = (A.rev + B.rev) / 200 + (A.vic + B.vic) / 400;
    const both = A.dem >= 7 && B.dem >= 7, one = A.dem >= 7 || B.dem >= 7;
    const demF = both ? 0.12 : one ? 0.8 : 1;
    const allyF = 1 - 0.95 * al.s;
    const pr = Math.min(A.power, B.power) / Math.max(A.power, B.power);
    const parity = 0.55 + 0.9 * pr;
    const instab = 0.6 + 0.8 * ((200 - A.stab - B.stab) / 200);
    const bothNuke = A.nukes > 0 && B.nukes > 0;

    let clashH = 0.0025 * Math.exp(5 * T) * opp * (0.45 + 1.6 * agg) * demF * allyF * parity * instab * (bothNuke ? 0.9 : 1);
    let esc = 0.16 * (0.6 + agg) * (bothNuke ? 0.22 : (A.nukes > 0 || B.nukes > 0) ? 0.7 : 1) * (0.6 + 0.6 * pr) * (land ? 1.25 : 0.7)
      * (1 + 2 * T * Math.max(A.rev, B.rev) / 100);
    let clash1 = 1 - Math.exp(-clashH);
    let war1 = 1 - Math.exp(-clashH * esc);
    let clash10 = 1 - Math.pow(1 - clash1, 10);
    let war10 = 1 - Math.pow(1 - war1, 10);
    if (r && r.active) { clash1 = 0.99; war1 = 0.95; clash10 = 0.99; war10 = 0.97; drivers.push('Active war'); }
    clash10 = Math.min(clash10, 0.99); war10 = Math.min(war10, 0.97);

    if (T > 0) drivers.push(r.note);
    if (land) drivers.push('Shared land border');
    else if (near) drivers.push('Close maritime proximity');
    if (agg > 0.6) drivers.push('High revisionism / ruthlessness');
    if (both) drivers.push('Democratic-peace dampener');
    if (al.s > 0) drivers.push('Allied via ' + al.name);
    if (bothNuke) drivers.push('Mutual nuclear deterrence');
    if (pr > 0.6) drivers.push('Rough military parity');

    // Conflict type
    let type;
    if (r && r.active) type = 'Ongoing war';
    else if (war10 > 0.12) type = 'Full-scale war plausible';
    else if (clash10 > 0.35) type = 'Border/maritime clashes likely';
    else if (clash10 > 0.1) type = 'Militarised crisis';
    else type = 'Low risk';

    const out = { a: aIso, b: bIso, T, clash1, war1, clash10, war10, dist, land, ally: al, type, drivers, note: r ? r.note : '' };
    dyadCache.set(key, out);
    return out;
  }

  function outlook(iso) {
    const list = COUNTRIES.filter(o => o.iso !== iso).map(o => dyad(iso, o.iso));
    list.sort((x, y) => y.clash10 - x.clash10);
    const anyClash = 1 - list.reduce((p, d) => p * (1 - d.clash10), 1);
    const anyWar = 1 - list.reduce((p, d) => p * (1 - d.war10), 1);
    const top = list.slice(0, 8).map(d => ({ ...d, other: d.a === iso ? d.b : d.a }));
    return { anyClash: Math.min(anyClash, 0.99), anyWar: Math.min(anyWar, 0.97), top };
  }

  function likelyAllies(iso, enemyIso) {
    // Who would likely fight alongside `iso` against `enemyIso`
    const res = [];
    for (const c of COUNTRIES) {
      if (c.iso === iso || c.iso === enemyIso) continue;
      const withUs = alliance(iso, c.iso).s;
      const withThem = alliance(enemyIso, c.iso).s;
      const rivThem = rivalry(enemyIso, c.iso)?.t || 0;
      const rivUs = rivalry(iso, c.iso)?.t || 0;
      const score = withUs * (1 - withThem) + 0.35 * rivThem - 0.35 * rivUs;
      if (score > 0.2) res.push({ iso: c.iso, score });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  let globalCache = null;
  function globalHotspots(n = 15) {
    if (!globalCache) {
      const all = [];
      for (let i = 0; i < COUNTRIES.length; i++)
        for (let j = i + 1; j < COUNTRIES.length; j++) {
          const d = dyad(COUNTRIES[i].iso, COUNTRIES[j].iso);
          if (d.clash10 > 0.02) all.push(d);
        }
      all.sort((x, y) => (y.war10 * 2 + y.clash10) - (x.war10 * 2 + x.clash10));
      globalCache = all;
    }
    return globalCache.slice(0, n);
  }

  function finalize() {
    COUNTRIES.forEach(c => {
      const o = outlook(c.iso);
      c.warRisk = Math.round(o.anyClash * 100);
      c.fullWarRisk = Math.round(o.anyWar * 100);
      c.topRival = o.top[0]?.other;
    });
  }

  return { computeIndices, setGeo, dyad, outlook, likelyAllies, alliance, alliancesOf, rivalry, distanceKm, contiguous, globalHotspots, finalize, clamp };
})();
