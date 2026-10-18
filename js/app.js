/* =====================================================================
   WARGAMES — app bootstrap & hash router
   Routes:  #/analysis  #/country/USA  #/rankings  #/wargame[?a=CHN&b=TWN…]  #/method
   ===================================================================== */

const App = (() => {
  let ready = false;
  const inited = {};

  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  function show(tab) {
    document.querySelectorAll('.tab').forEach(t => (t.hidden = t.id !== 'tab-' + tab));
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab === 'wargame' && !inited.wargame) { WarGame.init(); inited.wargame = true; }
    if (tab !== 'wargame' && inited.wargame) WarGame.stop();
  }

  function route() {
    if (!ready) return;
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const [tab, arg] = path.split('/');
    if (tab === 'country' && BY_ISO[arg]) { show('analysis'); Analysis.showCountry(arg); }
    else if (tab === 'rankings') show('rankings');
    else if (tab === 'wargame') { show('wargame'); if (qs) WarGame.fromQuery(qs); }
    else if (tab === 'method') show('method');
    else show('analysis');
    window.scrollTo(0, 0);
  }

  async function boot() {
    try {
      const geo = await WorldMap.load('data/countries-50m.json');
      Model.computeIndices();
      Model.setGeo(geo);
      Model.finalize();
    } catch (e) {
      document.getElementById('loading').textContent = 'Could not load map data: ' + e.message;
      throw e;
    }
    document.getElementById('countryList').innerHTML = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.name}">`).join('');
    const search = document.getElementById('countrySearch');
    search.addEventListener('change', () => {
      const v = search.value.trim().toLowerCase();
      const c = COUNTRIES.find(c => c.name.toLowerCase() === v) || COUNTRIES.find(c => c.name.toLowerCase().startsWith(v));
      if (c) go('#/country/' + c.iso);
    });
    document.getElementById('rankFilter').addEventListener('input', Analysis.renderRankings);
    document.getElementById('loading').remove();
    // The analysis tab must be visible for its map to size correctly
    show('analysis');
    Analysis.init();
    renderMethod();
    ready = true;
    route();
  }

  function renderMethod() {
    document.getElementById('methodBody').innerHTML = `
      <h2>How WarGames works</h2>
      <p>WarGames combines a hand-compiled dataset on ${COUNTRIES.length} countries with two models: a <b>war-likelihood model</b> that scores every possible pair of countries, and a <b>war-game simulator</b> that plays a hypothetical war out day by day. Everything runs in your browser.</p>
      <p class="note">This is a simplified model for education and entertainment. Its estimates are not forecasts and nothing here is intelligence or policy advice. The figures are rounded public estimates (current as of 2025–26), and the qualitative scores are judgement calls.</p>

      <h3>1 · Country data</h3>
      <table>
        <tr><th>Field</th><th>Source / basis</th></tr>
        <tr><td>Population, GDP</td><td>IMF / World Bank estimates (2025)</td></tr>
        <tr><td>Military spending</td><td>SIPRI military expenditure database (2024)</td></tr>
        <tr><td>Active troops, reserves</td><td>IISS <i>Military Balance</i>-style estimates</td></tr>
        <tr><td>Nuclear warheads</td><td>Federation of American Scientists inventory (2025)</td></tr>
        <tr><td>Democracy</td><td>EIU Democracy Index (0–10)</td></tr>
        <tr><td>Patriotism</td><td>Surveys of national pride and "willingness to fight for your country" (WIN/Gallup), adjusted</td></tr>
        <tr><td>Soft power</td><td>Based on the Brand Finance Global Soft Power Index</td></tr>
        <tr><td>Intelligence</td><td>Editorial score for the reach, technical capability and covert-action record of each country's agencies</td></tr>
        <tr><td>Ruthlessness</td><td>Editorial score for willingness to use extreme force, based on regime type and record on the laws of war</td></tr>
        <tr><td>Revisionism</td><td>Editorial score for active territorial claims and ambitions to change the regional order</td></tr>
        <tr><td>Stability</td><td>Inverse of fragile-state indicators</td></tr>
        <tr><td>Alliances & rivalries</td><td>${ALLIANCES.length} treaty or alignment groups, each with a "will fight" strength, and ${RIVALRIES.length} known flashpoints, each with a tension score</td></tr>
      </table>

      <h3>2 · Composite indices</h3>
      <p><b>Military strength</b> = 42% defence spending (log-scaled), 18% active troops, 6% reserves, 34% technology, then blended 85/15 with a nuclear-arsenal score.
      <b>Economic strength</b> = 70% GDP size + 30% GDP per person (log-scaled). <b>National power</b> = 40% military + 30% economy + 10% each for soft power, intelligence and cohesion.
      <b>Power reach</b> sets how far from home a country can fight, and grows steeply with military strength.</p>

      <h3>3 · War-likelihood model</h3>
      <p>For every pair of countries (≈19,000 pairs) the model computes a yearly <i>hazard</i> of an armed clash:</p>
      <p><code>hazard = base × e^(5·tension) × opportunity × aggression × democratic-peace × alliance × parity × instability</code></p>
      <ul>
        <li><b>Tension</b> comes from the flashpoint list (0 if there is none).</li>
        <li><b>Opportunity</b>: 1 for a shared land border, 0.75 for close maritime neighbours, lower for distant pairs, and close to zero when neither side can reach the other.</li>
        <li><b>Aggression</b> grows with both sides' revisionism and ruthlessness.</li>
        <li><b>Democratic peace</b>: two established democracies get ×0.12.</li>
        <li><b>Alliance</b>: allies are heavily dampened (×(1 − 0.95·strength)).</li>
        <li><b>Parity</b>: roughly equal power raises the risk, because both sides think they can win.</li>
        <li><b>Instability</b>: fragile states raise it.</li>
      </ul>
      <p>Only some clashes become <b>full-scale wars</b>. That share is higher across land borders and with revisionist powers, and much lower when both sides have nuclear weapons. The 10-year probability is <code>1 − (1 − p)^10</code>. A country's overall risk combines all of its pairs: <code>1 − Π(1 − p_pair)</code>. Ongoing wars are pinned at ~97%.</p>

      <h3>4 · War-game simulator</h3>
      <ul>
        <li>Each side's <b>combat power</b> is the sum of its members' power (spending, technology, manpower). Allies far from the theatre count for less.</li>
        <li>Every simulated day, <b>Lanchester-style attrition</b> wears down both sides, depending on their share of effective firepower. Firepower is adjusted for technology, morale, economic health, the defender's advantage, amphibious penalties, surprise and a hidden "fog of war" factor.</li>
        <li><b>The front</b> moves according to the balance of power and the terrain. Land wars move fast, amphibious wars slower, and standoff wars (missiles, air and naval) are measured as military infrastructure destroyed rather than territory taken.</li>
        <li><b>Surprise attack</b> gives the attacker a bonus of up to +120% that fades over 12 days, scaled by the gap in intelligence capability. The defender is stunned for the first 4 days.</li>
        <li><b>Public support / unification</b> sets starting morale, how fast war-weariness builds, and how quickly losses can be replaced.</li>
        <li><b>Viciousness</b> raises combat intensity and civilian deaths. It also stiffens the enemy's resolve, increases international backlash and lowers the chance of a ceasefire.</li>
        <li><b>Intervention</b>: every outside country weighs its alliance ties and rivalries. Treaty allies of the side that was attacked join quickly. Allies of the aggressor are far less willing. Countries tied to both sides stay neutral. Neutral countries reconsider if the war escalates or one side starts collapsing. You can also force countries to join on chosen days.</li>
        <li><b>Diplomacy</b>: mediation, back-channels and ceasefire-seeking raise the daily chance of talks. Talks succeed only if the side that is ahead accepts. Sanctions drain the enemy economy, propaganda shifts morale, and arms aid speeds up resupply.</li>
        <li><b>Nuclear option</b> (only for sides with a nuclear-armed member):
          <ul>
            <li><i>No first use</i>: nuclear weapons are used only in retaliation.</li>
            <li><i>Last resort</i>: used when the state's survival is at stake.</li>
            <li><i>Escalate to de-escalate</i>: used when the side is losing.</li>
          </ul>
          Tactical use can lead to a strategic exchange, which ends the war in mutual devastation.</li>
        <li><b>Ending</b>: a war ends with surrender (forces or morale collapse), an imposed peace, a negotiated ceasefire, the end of the chosen timeline (frozen conflict), or nuclear catastrophe.</li>
        <li><b>Seeds</b> make runs repeatable. <i>Run 300× odds</i> repeats the scenario 300 times and shows how often each outcome happens.</li>
      </ul>

      <h3>Shareable links</h3>
      <p>Every view has a short address: <code>#/analysis</code>, <code>#/rankings</code>, <code>#/wargame</code>, <code>#/method</code>, and <code>#/country/USA</code> for any country (use its 3-letter code). War-game scenarios can be shared with <i>Copy a link to this scenario</i>, e.g. <code>#/wargame?a=CHN&amp;b=TWN&amp;s=A</code>.</p>`;
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', boot);
  return { go };
})();
