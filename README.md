# XO Casino — hero banner · `version-2-html`

Hero banner = **Adobe Animate (CreateJS) HTML banner**: `banners/desktop` (1308×480, used from 768 px)
and `banners/mobile` (343×396). `js/banner.js` loads the iframe only when its slide is shown and pauses
inactive / off-screen banners. The button is painted inside the canvas, so a real link
(`.hero-banner__cta`) sits exactly over it. CreateJS is loaded from `code.createjs.com`.

Static site, no build step — the branch root is the site root (`index.html`), ready for a preview deploy
(GitHub Pages / Vercel / Netlify: no build command, output directory = repository root).
Serve over http (not `file://`) so the banner iframes load.

Run locally:

```bash
python -m http.server 5173
```

The variant with the same interface and a video banner lives in the `version-1-video` branch.
`css/styles.css` and `js/main.js` are identical in both branches — keep them in sync when editing the UI.

Figma: XO Casino | UI — desktop `1361:16289`, mobile `1440:11406`, UI kit `1457:6596`.
Default / hover states follow the UI kit; extra states are in `css/styles.css` → "EXTRA STATES — NOT IN THE UI KIT".
Hero slides 2 and 3 are placeholders that only demonstrate pagination — replace or delete them.

Changes made to the Animate exports: transparent background instead of white,
`AdobeAn.makeResponsive(true,'both',true,2,…)` so the stage covers its slot, `__MACOSX` removed.
