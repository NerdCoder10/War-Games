/* =====================================================================
   WARGAMES — shared world-map component (D3 + TopoJSON)
   ===================================================================== */

const WorldMap = (() => {
  let topo = null, features = null;

  function isoForFeature(f) {
    if (f.id && BY_NUM[f.id]) return BY_NUM[f.id].iso;
    if (f.id && TERRITORIES[f.id]) return TERRITORIES[f.id];
    const nm = f.properties && f.properties.name;
    if (nm && TERRITORY_NAMES[nm]) return TERRITORY_NAMES[nm];
    return null;
  }

  // Centroid of the largest polygon (avoids overseas territories skewing it)
  function mainCentroid(f) {
    const g = f.geometry;
    if (!g) return null;
    if (g.type === 'Polygon') return d3.geoCentroid(f);
    let best = null, bestA = -1;
    for (const coords of g.coordinates) {
      const p = { type: 'Polygon', coordinates: coords };
      const a = d3.geoArea(p);
      if (a > bestA) { bestA = a; best = p; }
    }
    return d3.geoCentroid(best);
  }

  function buildGeo(t) {
    topo = t;
    const geoms = t.objects.countries.geometries;
    features = topojson.feature(t, t.objects.countries).features;
    features.forEach(f => (f.iso = isoForFeature(f)));
    const centroid = {}, neighbors = {}, radius = {};
    features.forEach(f => {
      // Sovereign main feature (not a territory) provides the centroid
      if (f.iso && ((BY_NUM[f.id] && BY_NUM[f.id].iso === f.iso) || f.iso === 'XKX')) {
        centroid[f.iso] = mainCentroid(f);
        radius[f.iso] = Math.sqrt(d3.geoArea(f) * 6371 * 6371 / Math.PI);
      }
    });
    Object.entries(FALLBACK_COORDS).forEach(([k, v]) => { if (!centroid[k]) centroid[k] = v; });
    const nb = topojson.neighbors(geoms);
    nb.forEach((list, i) => {
      const a = features[i].iso;
      if (!a) return;
      list.forEach(j => {
        const b = features[j].iso;
        if (!b || b === a) return;
        (neighbors[a] = neighbors[a] || new Set()).add(b);
        (neighbors[b] = neighbors[b] || new Set()).add(a);
      });
    });
    geoRef = { centroid, neighbors, radius };
    return geoRef;
  }

  /* Create an interactive map inside a container element. */
  function create(container, opts = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    const svg = d3.select(el).append('svg').attr('class', 'worldmap');
    const root = svg.append('g');
    const ocean = root.append('path').attr('class', 'ocean');
    const grat = root.append('path').attr('class', 'graticule');
    const land = root.append('g').attr('class', 'land');
    const overlay = root.append('g').attr('class', 'overlay');
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);
    const tip = d3.select(el).append('div').attr('class', 'map-tip');
    let fillFn = () => null, tipFn = f => f.properties.name;
    let k = 1;

    const paths = land.selectAll('path').data(features).join('path')
      .attr('class', d => 'country' + (d.iso ? '' : ' nodata'))
      .on('mousemove', (ev, d) => {
        const r = el.getBoundingClientRect();
        tip.style('display', 'block').html(tipFn(d))
          .style('left', Math.min(ev.clientX - r.left + 14, r.width - 220) + 'px')
          .style('top', (ev.clientY - r.top + 14) + 'px');
      })
      .on('mouseleave', () => tip.style('display', 'none'))
      .on('click', (ev, d) => { if (d.iso && opts.onClick) opts.onClick(d.iso, ev); });

    const zoom = d3.zoom().scaleExtent([1, 14]).on('zoom', ev => {
      k = ev.transform.k;
      root.attr('transform', ev.transform);
      overlay.selectAll('.scale-k').attr('transform', function () {
        const t = this.getAttribute('data-t');
        return t + ` scale(${1 / k})`;
      });
    });
    svg.call(zoom).on('dblclick.zoom', null);

    function resize() {
      const w = el.clientWidth, h = el.clientHeight || 400;
      svg.attr('viewBox', `0 0 ${w} ${h}`);
      projection.fitExtent([[6, 6], [w - 6, h - 6]], { type: 'Sphere' });
      ocean.attr('d', path({ type: 'Sphere' }));
      grat.attr('d', path(d3.geoGraticule10()));
      paths.attr('d', path);
      if (opts.onResize) opts.onResize();
    }
    new ResizeObserver(resize).observe(el);
    resize();

    function refresh() {
      paths.style('fill', d => (d.iso ? fillFn(d.iso, d) : null) || null)
        .classed('selected', d => opts.isSelected ? opts.isSelected(d.iso) : false);
    }

    return {
      svg, overlay, projection, path,
      setFill(fn) { fillFn = fn; refresh(); },
      setTip(fn) { tipFn = fn; },
      refresh,
      project(iso) {
        const c = Model && geoRef && geoRef.centroid[iso];
        return c ? projection(c) : null;
      },
      // Rotate the globe so `lon` sits in the middle (keeps Pacific theatres contiguous)
      setCenterLon(lon) {
        projection.rotate([-lon, 0]);
        resize();
      },
      zoomTo(isos, dur = 900, pad = {}) {
        const fs = features.filter(f => isos.includes(f.iso) && BY_ISO[f.iso] && (BY_NUM[f.id] || f.iso === 'XKX'));
        if (!fs.length) return;
        // Use each country's main polygon so overseas territories don't stretch the view
        const shapes = fs.map(f => {
          const g = f.geometry;
          if (g.type !== 'MultiPolygon') return f;
          let best = null, bestA = -1;
          for (const c of g.coordinates) { const p = { type: 'Polygon', coordinates: c }; const a = d3.geoArea(p); if (a > bestA) { bestA = a; best = p; } }
          return { type: 'Feature', geometry: best };
        });
        const [[x0, y0], [x1, y1]] = path.bounds({ type: 'FeatureCollection', features: shapes });
        const l = pad.l || 0, r = pad.r || 0, tp = pad.t || 0, b = pad.b || 0;
        const w = el.clientWidth - l - r, h = el.clientHeight - tp - b;
        const s = Math.max(1, Math.min(8, 0.75 / Math.max((x1 - x0) / w, (y1 - y0) / h)));
        const t = d3.zoomIdentity.translate(l + w / 2, tp + h / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
        svg.transition().duration(dur).call(zoom.transform, t);
      },
      resetZoom() { svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity); },
      get k() { return k; }
    };
  }

  let geoRef = null;
  async function load(url) {
    return buildGeo(await d3.json(url));
  }

  return { load, create, buildGeo, get geo() { return geoRef; } };
})();
