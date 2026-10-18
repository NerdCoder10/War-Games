/* =====================================================================
   WARGAMES — war simulation engine
   A stochastic, day-by-day model: Lanchester-style attrition, a moving
   front, morale & economic exhaustion, third-party intervention,
   diplomacy and nuclear escalation. Output is a list of daily snapshots
   plus a narrative event log.
   ===================================================================== */

const Sim = (() => {
  const VIC = {
    restrained: { label: 'Restrained', intensity: 0.8, civ: 0.07, rally: 0.0, backlash: 0.4, cease: 1.3 },
    conventional: { label: 'Conventional', intensity: 1.0, civ: 0.22, rally: 0.01, backlash: 1, cease: 1 },
    ruthless: { label: 'Ruthless', intensity: 1.2, civ: 0.6, rally: 0.03, backlash: 2, cease: 0.7 },
    total: { label: 'Total war', intensity: 1.4, civ: 1.1, rally: 0.05, backlash: 3, cease: 0.45 }
  };
  const POSTURE = { dove: 2.2, balanced: 1, hawk: 0.4 };
  const GOAL_DEPTH = { limited: 22, major: 55, total: 96 };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n));
  const names = list => {
    const n = list.map(i => BY_ISO[i].name);
    return n.length <= 2 ? n.join(' and ') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  };

  function run(cfg) {
    const R = rng(cfg.seed || 1);
    const rand = (a = 0, b = 1) => a + (b - a) * R();
    const pick = arr => arr[Math.floor(R() * arr.length)];
    const geo = WorldMap.geo;

    const sides = ['A', 'B'].map(k => {
      const s = cfg['side' + k];
      return {
        key: k, cfg: s, members: [...s.members], primary: s.members[0],
        joined: {}, vic: VIC[s.vic] || VIC.conventional, posture: POSTURE[s.posture] || 1,
        goalDepth: GOAL_DEPTH[s.goal] || 55, morale: 0, str: 0, S0: 0, econ: 100,
        casMil: 0, casCiv: 0, nukesUsed: 0, achieved: false, collapsed: false
      };
    });
    const [A, B] = sides;
    A.enemy = B; B.enemy = A;
    sides.forEach(s => s.members.forEach(m => (s.joined[m] = 0)));

    const cA = geo.centroid[A.primary], cB = geo.centroid[B.primary];
    const theater = d3.geoInterpolate(cA, cB)(0.5);
    const land = Model.contiguous(A.primary, B.primary);
    const gapKm = Model.distanceKm(A.primary, B.primary) - 0.6 * ((geo.radius[A.primary] || 50) + (geo.radius[B.primary] || 50));
    const warType = land ? 'land' : gapKm < 1400 ? 'amphibious' : 'standoff';
    const depthKm = s => Math.min((geo.radius[s.primary] || 100) * 1.4, 1200);
    const initiator = cfg.surprise === 'B' ? B : A;
    const defender = initiator.enemy;

    function commitment(s, iso) {
      if (iso === s.primary) return 1;
      const d = Math.min(Model.distanceKm(iso, s.primary), Model.distanceKm(iso, s.enemy.primary));
      const proj = d < 1500 ? 1 : Math.min(1, Math.pow(BY_ISO[iso].reach / d, 0.8));
      const al = Math.max(...s.members.filter(m => m !== iso).map(m => Model.alliance(iso, m).s), 0.3);
      return Math.max(0.05, proj * (0.35 + 0.5 * al));
    }
    function sideStats(s) {
      let pow = 0, techW = 0, intelW = 0, patW = 0, stabW = 0, troops = 0, gdp = 0, nukes = 0;
      for (const m of s.members) {
        const c = BY_ISO[m], w = c.power * commitment(s, m);
        pow += w; techW += c.tech * w; intelW += c.intel * w; patW += c.pat * w; stabW += c.stab * w;
        troops += (c.troops + c.reserves * 0.3) * 1000 * commitment(s, m);
        gdp += c.gdp; nukes += c.nukes;
      }
      const W = pow || 1;
      return { pow, tech: techW / W, intel: intelW / W, pat: patW / W, stab: stabW / W, troops, gdp, nukes };
    }
    sides.forEach(s => {
      s.st = sideStats(s);
      s.S0 = s.str = s.st.pow;
      s.morale = 0.5 * s.cfg.support + 0.3 * s.st.pat + 0.2 * s.st.stab;
      s.nuclear = s.st.nukes > 0;
      s.nukeOK = s.nuclear && s.cfg.nuclear && s.cfg.nuclear.enabled;
      s.fog = Math.exp((R() + R() + R() - 1.5) * 0.35);   // unknowns: leadership, doctrine, luck
    });

    const events = [], snaps = [];
    let front = 0;                 // + = A holds B's territory (%), - = B holds A's
    let escalation = 0;            // 0 conventional, 1 tactical nuclear, 2 strategic exchange
    let outcome = null, ceasefireTalks = 0, lastFrontMark = 0, casMarks = [10e3, 50e3, 100e3, 250e3, 500e3, 1e6, 2e6, 5e6, 1e7];
    let phase = 'Opening', calmDays = 0, pressure = 0;
    const maxDays = cfg.maxDays || 730;
    const maxJoins = cfg.expansion?.max ?? 8;
    let joinsSoFar = 0;
    const decided = {}, scoreCache = {};
    let memberVer = 0;

    const jitter = (p, r = 2.5) => [p[0] + rand(-r, r), p[1] + rand(-r * 0.6, r * 0.6)];
    const enemyPoint = s => jitter(geo.centroid[s.enemy.primary], 2);
    function ev(day, type, side, text, sev = 1, loc = null) {
      events.push({ day, type, side: side ? side.key : null, text, sev, loc, phase });
    }

    /* ---------- Opening ---------- */
    const aN = BY_ISO[A.primary].name, bN = BY_ISO[B.primary].name;
    if (cfg.surprise === 'A' || cfg.surprise === 'B') {
      const s = initiator, e = defender;
      ev(0, 'surprise', s, `<b>Surprise attack.</b> ${BY_ISO[s.primary].name} launches a pre-emptive ${warType === 'land' ? 'combined-arms offensive across the border' : warType === 'amphibious' ? 'missile barrage and amphibious assault' : 'long-range missile and air campaign'} with no declaration of war. ${BY_ISO[e.primary].name}'s forward air defences, command nodes and airfields are hit in the first hours.`, 3, enemyPoint(s));
      if (s.st.intel > e.st.intel + 10) ev(0, 'intel', s, `${BY_ISO[s.primary].name}'s intelligence services achieved strategic surprise — ${BY_ISO[e.primary].name}'s warnings were missed or dismissed.`, 2);
      else ev(0, 'intel', e, `${BY_ISO[e.primary].name}'s intelligence detected preparations days earlier, blunting some of the surprise.`, 1);
    } else {
      ev(0, 'start', A, `<b>War begins.</b> After a breakdown in diplomacy, ${aN} declares hostilities against ${bN}. Both sides mobilise; ${warType === 'land' ? 'armoured columns mass along the border' : warType === 'amphibious' ? 'naval and air forces contest the sea gap' : 'the war opens as a long-range strike contest'}.`, 3, theater);
    }
    sides.forEach(s => {
      if (s.members.length > 1) ev(0, 'coalition', s, `Coalition formed: ${names(s.members)}.`, 2);
      if (s.nuclear) ev(0, 'nuclear-posture', s, s.nukeOK
        ? `${names(s.members.filter(m => BY_ISO[m].nukes > 0))} raise${s.members.filter(m => BY_ISO[m].nukes > 0).length > 1 ? '' : 's'} nuclear alert levels (doctrine: ${({ nfu: 'no first use', last: 'last resort', early: 'escalate-to-de-escalate' })[s.cfg.nuclear.doctrine]}).`
        : `Nuclear weapons are explicitly kept off the table by ${BY_ISO[s.primary].name}'s leadership.`, 2);
      if (s.cfg.support < 35) ev(1, 'home', s, `Large anti-war protests in ${BY_ISO[s.primary].name}; public support is fragile.`, 1);
      if (s.cfg.support > 80) ev(1, 'home', s, `${BY_ISO[s.primary].name} sees a massive rally-around-the-flag effect; volunteers overwhelm recruiting offices.`, 1);
    });

    /* ---------- Daily loop ---------- */
    for (let day = 1; day <= maxDays && !outcome; day++) {
      const early = Math.max(0, 1 - day / 45);
      const intensityBase = 0.55 + 0.95 * early;

      // Surprise effects
      const surpriseMult = s => {
        if (cfg.surprise !== s.key || day > 12) return 1;
        const edge = 0.55 + (s.st.intel - s.enemy.st.intel) / 200;
        return 1 + Math.max(0.2, edge) * (1 - day / 12) * 1.2;
      };
      const stunned = s => (cfg.surprise === s.enemy.key && day <= 4 ? 0.6 + day * 0.08 : 1);

      // Effective combat power
      const eff = {};
      sides.forEach(s => {
        const onDefence = (s === A && front < 0) || (s === B && front > 0) ? 1.25 : 1;
        const amph = warType !== 'land' && ((s === A && front >= 0) || (s === B && front <= 0)) && s === initiator ? 0.8 : 1;
        const moraleF = 0.45 + s.morale / 110;
        const econF = 0.6 + 0.4 * s.econ / 100;
        eff[s.key] = s.str * s.fog * (0.6 + s.st.tech / 160) * moraleF * econF * onDefence * amph * surpriseMult(s) * stunned(s);
      });
      const ratio = eff.A / (eff.A + eff.B);

      // Attrition
      sides.forEach(s => {
        const e = s.enemy;
        const r = s === A ? 1 - ratio : ratio;   // enemy share of firepower
        const lossFrac = 0.011 * intensityBase * e.vic.intensity * Math.pow(r / 0.5, 1.15) * rand(0.6, 1.4);
        s.str *= 1 - Math.min(0.2, lossFrac);
        const cas = s.st.troops * lossFrac * 0.22;
        s.casMil += cas;
        const civ = cas * e.vic.civ * (warType === 'standoff' ? 1.6 : 1) * rand(0.5, 1.5);
        s.casCiv += civ;
        s.lastLoss = lossFrac;
      });

      // Regeneration / mobilisation / aid
      sides.forEach(s => {
        const mob = 0.0016 * (s.cfg.support / 70) * (s.econ / 100) * (day < 120 ? 1.3 : 1);
        const aid = s.cfg.diplomacy.armsAid ? 0.0012 : 0;
        s.str = Math.min(s.S0 * 1.6, s.str + s.S0 * (mob + aid));
      });

      // Front movement
      const mobility = (warType === 'land' ? 1.8 : warType === 'amphibious' ? 0.75 : 0.18) * (0.5 + early);
      let dF = mobility * (ratio - 0.5) * 4 * rand(0.4, 1.6);
      if (A.achieved && dF > 0) dF *= 0.1;
      if (B.achieved && dF < 0) dF *= 0.1;
      if (front + dF > A.goalDepth && dF > 0) dF *= 0.15;
      if (-(front + dF) > B.goalDepth && dF < 0) dF *= 0.15;
      const prevFront = front;
      front = Math.max(-100, Math.min(100, front + dF));

      // Morale
      sides.forEach(s => {
        const lost = s === A ? Math.max(0, prevFront - front) : Math.max(0, front - prevFront);
        let dm = -s.lastLoss * 70 - lost * 0.5 - 0.035 * (1 - s.cfg.support / 100) * (1 + day / 365);
        dm += s.enemy.vic.rally * early * 2;      // enemy atrocities harden resolve
        if (s.cfg.diplomacy.propaganda) dm += 0.04;
        if (s.enemy.cfg.diplomacy.propaganda) dm -= 0.02;
        dm += 0.12 * (s.cfg.support / 100);       // baseline resilience
        s.morale = Math.max(s.cfg.support / 6, Math.min(100, s.morale + dm));
      });

      // Economy
      sides.forEach(s => {
        let d = 0.025 + 0.02 * s.lastLoss * 50;
        if (s.enemy.cfg.diplomacy.sanctions) d += 0.04 * Math.min(1.5, s.enemy.st.gdp / Math.max(1, s.st.gdp)) ** 0.5;
        if (warType === 'standoff') d += 0.02;
        s.econ = Math.max(10, s.econ - d + (s.cfg.diplomacy.armsAid ? 0.01 : 0));
      });

      // Front milestones
      const depthNow = Math.floor(Math.abs(front) / 10);
      if (depthNow !== lastFrontMark && Math.abs(front) > 4) {
        const adv = front > 0 ? A : B, def = adv.enemy;
        const km = Math.round(Math.abs(front) / 100 * depthKm(def));
        const forward = depthNow > lastFrontMark;
        if (forward && warType === 'standoff') ev(day, 'advance', adv, `${BY_ISO[adv.primary].name} gains the upper hand in the strike war: an estimated ${Math.round(Math.abs(front))}% of ${BY_ISO[def.primary].name}'s military infrastructure, air defences and launch sites are destroyed.`, 2, jitter(geo.centroid[def.primary], 2));
        else if (warType === 'standoff') ev(day, 'counter', def, `${BY_ISO[def.primary].name} reconstitutes defences and strikes back; ${BY_ISO[adv.primary].name}'s advantage shrinks to ~${Math.round(Math.abs(front))}%.`, 2, jitter(geo.centroid[adv.primary], 2));
        else if (forward) ev(day, 'advance', adv, `${BY_ISO[adv.primary].name} forces push ~${km} km into ${BY_ISO[def.primary].name}${warType !== 'land' ? '-held territory after contested landings' : ''}, controlling about ${Math.round(Math.abs(front))}% of the contested zone.`, 2, jitter(d3.geoInterpolate(theater, geo.centroid[def.primary])(Math.min(0.9, Math.abs(front) / 100)), 1));
        else ev(day, 'counter', def, `${BY_ISO[def.primary].name} counter-attacks and recovers ground; the front falls back to ~${km} km.`, 2, jitter(theater, 1.2));
        lastFrontMark = depthNow;
      }

      // Phases
      const newPhase = day < 14 ? 'Opening' : Math.abs(dF) < 0.08 && day > 60 ? 'Stalemate' : (dF > 0 && front < 0) || (dF < 0 && front > 0) ? 'Counter-offensive' : day < 90 ? 'Offensive' : 'Attrition';
      if (newPhase !== phase && day > 2) {
        phase = newPhase;
        if (phase === 'Stalemate') calmDays++;
        ev(day, 'phase', null, `<i>New phase: ${phase}.</i>`, 1);
      }

      // Casualty milestones
      const total = A.casMil + B.casMil + A.casCiv + B.casCiv;
      while (casMarks.length && total >= casMarks[0]) {
        ev(day, 'casualties', null, `Combined casualties pass <b>${fmt(casMarks[0])}</b> (military killed & wounded plus civilian deaths).`, casMarks[0] >= 1e5 ? 2 : 1);
        casMarks.shift();
      }

      // Flavour events
      if (R() < 0.05) flavour(day);

      // Diplomacy events
      sides.forEach(s => {
        const d = s.cfg.diplomacy, nm = BY_ISO[s.primary].name;
        if (d.sanctions && day === 3) ev(day, 'diplo', s, `${nm} and partners impose sweeping sanctions on ${BY_ISO[s.enemy.primary].name}: asset freezes, SWIFT cut-offs and export controls.`, 2);
        if (d.mediation && day === 6) ev(day, 'diplo', s, `${nm} requests an emergency UN Security Council session and invites third-party mediation.`, 1);
        if (d.backchannel && day === 20) ev(day, 'diplo', s, `Secret back-channel talks open between ${nm} and ${BY_ISO[s.enemy.primary].name} via a neutral intermediary.`, 1);
        if (d.armsAid && day === 10) ev(day, 'diplo', s, `An arms pipeline to ${nm} begins: munitions, air defence and drones from friendly states.`, 1);
        if (d.propaganda && day === 2) ev(day, 'info', s, `${nm} launches a large information campaign — narratives, leaks and influence operations target enemy morale and neutral opinion.`, 1);
      });

      // Third-party intervention
      if (joinsSoFar < maxJoins) intervention(day);
      (cfg.expansion?.scheduled || []).forEach(sc => {
        if (sc.day !== day || A.members.includes(sc.iso) || B.members.includes(sc.iso)) return;
        addMember(sc.side === 'A' ? A : B, sc.iso, day, 'by scenario design');
      });

      // International pressure
      pressure += 0.002 * (A.vic.backlash + B.vic.backlash) + (escalation > 0 ? 0.05 : 0);
      if (day % 60 === 0 && (A.vic.backlash + B.vic.backlash) >= 4) ev(day, 'diplo', null, `Reports of mass atrocities trigger international outrage and calls for war-crimes investigations.`, 2);

      // Nuclear escalation
      nuclearCheck(day);
      if (outcome) break;

      // Objectives
      sides.forEach(s => {
        const held = s === A ? front : -front;
        if (!s.achieved && held >= s.goalDepth * 0.95 && s.cfg.goal !== 'total') {
          s.achieved = true;
          ev(day, 'objective', s, `${BY_ISO[s.primary].name} has achieved its ${s.cfg.goal} war aims and shifts to defending the gains.`, 2);
        }
      });

      // Collapse
      for (const s of sides) {
        const e = s.enemy;
        if (s.str < s.S0 * 0.16 || s.morale < 7 || (s === A ? -front : front) > 92) {
          const enemyName = BY_ISO[e.primary].name, nm = BY_ISO[s.primary].name;
          if (e.cfg.goal === 'total') outcome = { winner: e.key, kind: 'surrender', text: `${nm}'s armed forces collapse. ${enemyName} imposes unconditional surrender and regime change.` };
          else outcome = { winner: e.key, kind: 'peace', text: `${nm}'s war effort breaks down and it sues for peace on ${enemyName}'s terms.` };
          ev(day, 'end', e, `<b>${outcome.text}</b>`, 3, geo.centroid[s.primary]);
          break;
        }
      }
      if (outcome) { snapshot(day); break; }

      // Ceasefire / negotiations
      let p = 0.0011 * (1 + day / 150) * Math.sqrt(A.posture * B.posture) * Math.sqrt(A.vic.cease * B.vic.cease);
      if (A.cfg.diplomacy.mediation || B.cfg.diplomacy.mediation) p *= 1.8;
      if (A.cfg.diplomacy.backchannel || B.cfg.diplomacy.backchannel) p *= day > 20 ? 1.7 : 1;
      if (A.cfg.diplomacy.ceasefire || B.cfg.diplomacy.ceasefire) p *= 2.2;
      if (A.achieved || B.achieved) p *= 5;
      p *= 1 + (100 - Math.min(A.morale, B.morale)) / 60;
      p *= 1 + pressure * 0.5;
      if (escalation > 0) p *= 4;
      if (phase === 'Stalemate') p *= 1.8;
      if (day > 7 && R() < p) {
        const talks = ++ceasefireTalks;
        // Will the stronger side accept?
        const adv = ratio > 0.5 ? A : B;
        const accept = adv.achieved || R() < 0.35 + 0.6 * (1 - Math.abs(ratio - 0.5) * 2) || adv.posture > 1.5;
        if (accept) {
          const held = front;
          const winner = Math.abs(held) < 6 ? null : held > 0 ? 'A' : 'B';
          outcome = {
            winner, kind: 'ceasefire',
            text: winner ? (warType === 'standoff' ? `Negotiated ceasefire with ${BY_ISO[(winner === 'A' ? A : B).primary].name} holding the upper hand (~${Math.round(Math.abs(held))}% of enemy military capacity destroyed).` : `Negotiated ceasefire. ${BY_ISO[(winner === 'A' ? A : B).primary].name} holds ~${Math.round(Math.abs(held))}% of the contested zone; the line freezes.`) : 'Negotiated ceasefire restoring roughly the pre-war line (status quo ante).'
          };
          ev(day, 'end', null, `<b>${outcome.text}</b>`, 3, theater);
          snapshot(day); break;
        } else {
          ev(day, 'diplo', null, `Ceasefire talks (round ${talks}) collapse — ${BY_ISO[adv.primary].name} believes it can still win on the battlefield.`, 1);
        }
      }

      snapshot(day);
      if (day === maxDays) {
        const winner = Math.abs(front) < 8 ? null : front > 0 ? 'A' : 'B';
        outcome = { winner, kind: 'stalemate', text: winner ? `Timeline ends in a frozen conflict, ${BY_ISO[(winner === 'A' ? A : B).primary].name} holding ~${Math.round(Math.abs(front))}% of the contested zone.` : 'Timeline ends in a grinding stalemate with no decisive result.' };
        ev(day, 'end', null, `<b>${outcome.text}</b>`, 3, theater);
      }
    }

    function snapshot(day) {
      snaps.push({
        day, front, escalation,
        strA: A.str / A.S0, strB: B.str / B.S0, moraleA: A.morale, moraleB: B.morale,
        econA: A.econ, econB: B.econ,
        casMilA: A.casMil, casMilB: B.casMil, casCivA: A.casCiv, casCivB: B.casCiv,
        membersA: [...A.members], membersB: [...B.members]
      });
    }

    function addMember(s, iso, day, why) {
      s.members.push(iso); s.joined[iso] = day; joinsSoFar++; memberVer++;
      const before = s.st.pow;
      s.st = sideStats(s);
      const gain = s.st.pow - before;
      s.str += gain; s.S0 += gain;
      s.morale = Math.min(100, s.morale + 25 * Math.min(1, gain / Math.max(1, before)) + 3);
      if (BY_ISO[iso].nukes > 0) { s.nuclear = true; s.nukeOK = s.nukeOK || (s.cfg.nuclear && s.cfg.nuclear.enabled); }
      const nm = BY_ISO[iso].name;
      ev(day, 'join', s, `<b>${nm} enters the war</b> on the side of ${BY_ISO[s.primary].name} — ${why}.`, 3, geo.centroid[iso]);
    }

    // Each outside state decides once (at a random moment) whether to intervene;
    // the decision is re-rolled when the war escalates or its partner is collapsing.
    function intervention(day) {
      if (!(cfg.expansion && cfg.expansion.auto)) return;
      const inWar = new Set([...A.members, ...B.members]);
      for (const c of COUNTRIES) {
        if (inWar.has(c.iso) || c.military < 8) continue;
        const score = s => {
          let best = 0, why = null;
          for (const m of s.members) {
            const al = Model.alliance(c.iso, m);
            const w = m === s.primary ? 1 : 0.2;   // treaty obligations bind to the attacked state
            if (al.s * w > best) { best = al.s * w; why = al.name; }
          }
          for (const m of s.enemy.members) {
            const rv = Model.rivalry(c.iso, m);
            const local = Model.distanceKm(c.iso, m) < 2500 ? 1 : 0.4;
            if (rv && rv.t * 0.5 * local > best) { best = rv.t * 0.5 * local; why = 'long-standing rivalry with ' + BY_ISO[m].name; }
          }
          return { v: best, why };
        };
        let sc0 = scoreCache[c.iso];
        if (!sc0 || sc0.ver !== memberVer) sc0 = scoreCache[c.iso] = { ver: memberVer, sa: score(A), sb: score(B) };
        const sa = sc0.sa, sb = sc0.sb;
        if (sa.v > 0.25 && sb.v > 0.25) continue;      // cross-pressured → stays neutral
        const s = sa.v > sb.v ? A : B, sc = sa.v > sb.v ? sa : sb;
        if (sc.v < 0.25) continue;
        const prev = decided[c.iso];
        if (prev && prev.yes && day < prev.day) continue;
        const defending = s === defender ? 1 : 0.18;   // aggressor's allies are reluctant
        const prox = Math.min(Model.distanceKm(c.iso, A.primary), Model.distanceKm(c.iso, B.primary)) < c.reach ? 1 : 0.3;
        const crisis = (1 - s.str / s.S0) * 0.5 + escalation * 0.25;
        const P = Math.min(0.95, (1.15 * Math.pow(sc.v, 1.5) + crisis * sc.v) * defending * prox);
        const d = decided[c.iso];
        const reroll = d && !d.yes && (escalation > d.esc || crisis > d.crisis + 0.25);
        if (!d || reroll) {
          const yes = R() < (reroll ? P * 0.5 : P);
          const delay = sc.v > 0.7 && defending === 1 ? rand(1, 10) : rand(3, 75);
          decided[c.iso] = { yes, day: day + Math.round(delay), esc: escalation, crisis };
        }
        const dd = decided[c.iso];
        if (dd.yes && day >= dd.day) { addMember(s, c.iso, day, sc.why); if (joinsSoFar >= maxJoins) return; }
      }
    }

    function nuclearCheck(day) {
      for (const s of sides) {
        if (!s.nukeOK) continue;
        const e = s.enemy;
        const doctrine = s.cfg.nuclear.doctrine;
        const ownLost = s === A ? -front : front;
        const worn = s.str / s.S0;
        const losing = day > 5 && (ownLost > 20 || (worn < 0.6 && s.str < e.str * 0.6) || s.morale < 22);
        const existential = ownLost > 55 || s.str < s.S0 * 0.28;
        const retaliation = e.nukesUsed > 0 && s.nukesUsed < e.nukesUsed;
        let p = 0;
        if (retaliation) p = 0.7;
        else if (doctrine === 'early' && losing) p = 0.05;
        else if (doctrine === 'last' && existential) p = 0.06;
        else if (doctrine === 'early' && e.st.nukes === 0 && day > 30 && s.str < e.str) p = 0.01;
        p *= (s.vic.intensity / 1.0);
        if (p > 0 && R() < p) {
          s.nukesUsed++;
          const nm = BY_ISO[s.primary].name, en = BY_ISO[e.primary].name;
          if (escalation === 0) {
            escalation = 1;
            const dead = Math.round(rand(15e3, 180e3));
            e.casCiv += dead * 0.6; e.casMil += dead * 0.4;
            e.str *= 0.75; e.morale = Math.max(5, e.morale - 18);
            ev(day, 'nuclear', s, `☢️ <b>NUCLEAR USE.</b> ${nm} detonates ${retaliation ? 'retaliatory ' : ''}low-yield tactical nuclear weapons against ${en}'s forces. Estimated ${fmt(dead)} killed. Global markets crash; the world holds its breath.`, 4, enemyPoint(s));
          } else if (escalation === 1) {
            if (e.nukeOK && e.nuclear && R() < 0.3) {
              escalation = 2;
              const popA = s.members.reduce((t, m) => t + BY_ISO[m].pop, 0) * 1e6;
              const popB = e.members.reduce((t, m) => t + BY_ISO[m].pop, 0) * 1e6;
              const fA = Math.min(0.25, 0.04 + e.st.nukes / 20000), fB = Math.min(0.25, 0.04 + s.st.nukes / 20000);
              s.casCiv += popA * fA; e.casCiv += popB * fB;
              ev(day, 'nuclear', s, `☢️☢️ <b>STRATEGIC NUCLEAR EXCHANGE.</b> Cities in ${names(s.members.filter(m => BY_ISO[m].pop > 1))} and ${names(e.members.filter(m => BY_ISO[m].pop > 1))} are struck. Tens of millions dead; nuclear winter effects threaten global harvests.`, 5, geo.centroid[e.primary]);
              outcome = { winner: null, kind: 'nuclear', text: 'Mutual nuclear devastation. No meaningful victor; the belligerent states cease to function as organised societies.' };
              ev(day, 'end', null, `<b>${outcome.text}</b>`, 5);
              snapshot(day);
              return;
            } else {
              const dead = Math.round(rand(40e3, 400e3));
              e.casCiv += dead; e.str *= 0.7; e.morale = Math.max(3, e.morale - 25);
              ev(day, 'nuclear', s, `☢️ ${nm} conducts further nuclear strikes on ${en}'s military infrastructure (${fmt(dead)} killed).`, 4, enemyPoint(s));
            }
          }
        }
      }
    }

    function flavour(day) {
      const s = R() < 0.5 ? A : B, e = s.enemy, nm = BY_ISO[s.primary].name, en = BY_ISO[e.primary].name;
      const opts = [];
      if (s.st.intel > 55) opts.push([`${nm}'s intelligence services sabotage ${en}'s rail logistics and assassinate a senior commander.`, 'intel']);
      if (s.st.tech > 60) opts.push([`${nm} launches a massed drone & cruise-missile strike on ${en}'s energy grid.`, 'strike']);
      if (s.st.tech > 70) opts.push([`Cyber-attack attributed to ${nm} cripples ${en}'s banking and air-traffic systems for 36 hours.`, 'cyber']);
      if (warType !== 'land' || R() < 0.3) opts.push([`Major naval engagement: ${nm} sinks several ${en} vessels; both sides lose ships.`, 'naval']);
      if (s.morale < 35) opts.push([`Desertions and draft-dodging spike in ${nm}; units refuse orders on parts of the front.`, 'home']);
      if (s.econ < 55) opts.push([`${nm} faces fuel and ammunition shortages as its war economy strains.`, 'econ']);
      if (s.vic === VIC.total || s.vic === VIC.ruthless) opts.push([`${nm} forces bombard ${en}'s cities indiscriminately; humanitarian agencies report catastrophic civilian losses.`, 'atrocity']);
      if (s.vic === VIC.restrained) opts.push([`${nm} agrees to a humanitarian corridor to evacuate civilians from the front line.`, 'humanitarian']);
      opts.push([`${nm} wins local air superiority over a key sector for several days.`, 'air']);
      opts.push([`Heavy artillery duels along the front with little movement.`, 'combat']);
      const [text, type] = pick(opts);
      ev(day, type, s, text, 1, type === 'strike' || type === 'atrocity' || type === 'cyber' ? enemyPoint(s) : jitter(theater, 1.5));
    }

    if (!snaps.length) snapshot(0);
    const last = snaps[snaps.length - 1];
    return {
      cfg, events, snaps, outcome, theater, warType, A: summary(A), B: summary(B),
      days: last.day, initiator: initiator.key
    };
    function summary(s) {
      return { primary: s.primary, members: s.members, joined: s.joined, casMil: s.casMil, casCiv: s.casCiv, econ: s.econ, morale: s.morale, str: s.str / s.S0, nukesUsed: s.nukesUsed, nuclear: s.nuclear };
    }
  }

  return { run, VIC, fmt };
})();
