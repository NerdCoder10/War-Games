# WarGames

**Global conflict analysis and a hypothetical war simulator for every country on Earth.**

WarGames is a static website (plain HTML, CSS and JavaScript, with D3 for the map). It has no build step and no server code.

## What's inside

| Tab | What it does |
|---|---|
| **Global Analysis** | An interactive world map you can colour by 13 metrics: war likelihood, full-scale war risk, national power, military, economy, soft power, patriotism, intelligence, ruthlessness, revisionism, stability, democracy and internal-conflict risk. Click any country to open its dossier: key stats, a strength profile, its 10-year war outlook, its most likely adversaries (with probabilities and the reasons behind them), likely allies and its alliances. |
| **Rankings** | A sortable, filterable table of all 197 countries. |
| **War Game** | A full-screen interactive map where you set up a hypothetical war and watch it play out. |
| **Methodology** | How the data, the indices, the war-likelihood model and the simulator work. |

### War-game options
- **Sides:** click countries on the map, or type their names. The first country listed on each side (★) leads it. There are also 15 preset scenarios, such as the Taiwan Strait, Korea, the Baltics, India–Pakistan and Israel–Iran.
- **Public support / national unification:** a slider for each side.
- **Surprise attack:** a declared war, or either side striking first by surprise.
- **Nuclear option:** only for sides that include a nuclear-armed state. Choose a doctrine: no first use, last resort, or escalate to de-escalate.
- **Viciousness:** restrained, conventional, ruthless or total war.
- **War aims:** limited, major or total.
- **Diplomatic posture:** dove, balanced or hawk.
- **Diplomacy:** UN mediation, a sanctions coalition, back-channel talks, propaganda, arms aid, or seeking an early ceasefire.
- **War expansion:** allies and rivals can join automatically (you set the maximum number), or you can force a specific country to join on a chosen day.
- **Timeline format:** day-by-day, weekly, monthly, by phase, or headlines only. Maximum length runs from 3 months to 5 years.
- **Run war:** an animated playback on the map, with a scrubber and a front-line gauge.
- **Run 300× odds:** a Monte Carlo summary showing win, draw and nuclear probabilities and which countries tend to join.
- **Share:** a link that reproduces the scenario.

## Short, shareable URLs

Every view has a short hash route:

```
/#/analysis        /#/rankings        /#/wargame        /#/method
/#/country/USA     (any 3-letter country code)
/#/wargame?a=CHN&b=TWN&s=A          (a shareable scenario)
```

## Hosting & a short address

The site is published with **GitHub Pages**. The workflow in `.github/workflows/pages.yml` deploys it on every push to `main`.

1. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions** (one-time).
2. Merge this branch into `main`. The site will be live at `https://nerdcoder10.github.io/War-Games/`.

To make the address easier to type:

- **Rename the repo** to `wargames` (**Settings → General → Repository name**). The address becomes **`nerdcoder10.github.io/wargames`**. GitHub redirects the old repo URL, and the site uses only relative paths, so nothing breaks.
- **Or use the root address:** name the repo `nerdcoder10.github.io` to serve the site at **`nerdcoder10.github.io`**.
- **Or use a custom domain** (for example `wargames.example.com`): add it under **Settings → Pages → Custom domain**.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```
(Open it through a local server rather than as a `file://` path, because the browser blocks loading the map data from a file.)

## Project layout

```
index.html                 page shell & tabs
css/style.css              styles (dark "situation room" theme, responsive)
data/countries-50m.json    world map (Natural Earth via world-atlas, public domain)
js/data.js                 country dataset, alliances, rivalries, profiles
js/model.js                composite indices + dyadic war-likelihood model
js/map.js                  shared D3 world-map component
js/sim.js                  day-by-day war simulation engine
js/analysis.js             Global Analysis & Rankings tabs
js/wargame.js              War Game tab
js/app.js                  router & methodology page
```

## Disclaimer

WarGames is a simplified model for education and entertainment. Its numbers are rounded public estimates (current as of 2025–26), and its qualitative scores (patriotism, intelligence, ruthlessness and so on) are judgement calls. Its outputs are not forecasts or policy advice.
