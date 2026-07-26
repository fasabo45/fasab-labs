# fasab-labs 

A collection of self-contained, zero-build **browser toys** — open the HTML, no server or npm required. Everything runs client-side.

## The apps

| App | File | What it does |
|-----|------|--------------|
|  **Series Forge** | `series_forge.html` | Generative art editions forged from your own reference library. Deterministic formula codes, degradation FX, CoD-style HUD overlays, transmission/UFO overlays, and sweep-to-video export. Modular engine: `forge.js`, `engine.js`, `degrade.js`, `hud.js`, `overlays.js`, `video.js`. |
|  **DnB Generator** | `dnb_generator.html` | Web Audio beat machine — Drum & Bass + French Electro + G-House, step sequencer, FX, pattern presets. Samples in `samples.js`. |
|  **AI Art Studio** | `ai_art_studio.html` | Procedural + AI-assisted art playground (`art.js`). Bring your own AI key (stored locally in your browser only). |
|  **Sound Visualizer** | `sound_visualizer.html` | Real-time audio-reactive visuals. |
|  **Note Detector** | `note_detector.html` | Pitch / note detection from the mic. |

## Running

Just open any `.html` file in a modern browser. That's it. Some apps store data locally (IndexedDB / localStorage) so your work survives refreshes.

For the ones that like being served over `http://` instead of `file://`:

```bash
# from the repo root
python -m http.server 8000
# then visit http://localhost:8000/series_forge.html
```

## Notes

- **No secrets live in this repo.** Any API keys (e.g. AI Art Studio) are typed at runtime and kept in your browser's localStorage — never committed.
- Desktop shortcut + icon helpers (`create_*_shortcut.ps1`, `*.ico`) are Windows conveniences.

## License

[MIT](LICENSE) © 2026 Fasab
