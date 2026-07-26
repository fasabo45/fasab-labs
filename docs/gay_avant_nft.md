# Gay / Avant NFT art - working definition (for the Brain / Curator)

Source: "Notes from the Avant NFT Underground" by GardenParty85,
*Right Click Save* (rightclicksave.com), 3 Nov 2025.
Distilled by Brodie from the article Fasab provided.

> This file is our "definition of done." The app's Brain is numeric - it scores
> the LOOK, not the concept. This doc records both, and which parts are actually
> scoreable, so the Curator isn't guessing.

## One-liner

"Avant NFTs" (jokingly "Gay NFTs") are a grassroots, internet-native art
movement defined - like Fluxus - by a **conceptual approach and a network**,
NOT by a single visual style. Aesthetically aware, guided by **humor and the
absurd**, transgressive, and largely a **reaction against corporate PFP
projects** (CryptoPunks / BAYC).

## Core VISUAL methods (these the Brain CAN score)

1. **Layered, trait-based generative collage.** Automated image generation
   (HashLips) stacking artist-provided layers, with an element of chance /
   Surrealist automatism.
2. **Maximalism / "schizocollage" / "trait maxing".** Pushing images to the
   limit of *formal superabundance* - dense, overloaded, chaotic.
3. **Appropriation collage.** Mixing originally-rendered assets with
   appropriated imagery: art history, video games, fashion, memes, and prior
   NFT collections (self-referential lore). Echoes **DADA photomontage** and
   **cubist collage**.
4. **Disrupting / obscuring a central subject.** The signature Mifella move:
   digital layers *disrupt* the subject, "often by completely obscuring the
   central character," which becomes "increasingly distorted and abused" until
   it dissolves. This is the heart of the look.
5. **Distortion + AI artifacts.** GANs / Stable Diffusion + custom Photoshop
   editing; glitch, degradation, "abused" figures.

There is a **spectrum**: from schizocollage-maximal (Mifella/Drifella) to
**refined / pared-down** lore-driven work (Cigawrette Packs, Super Metal Bosch).
So "maximal + distorted" is the most iconic pole, not the only one.

## Conceptual essence (NOT pixel-scoreable - noted for prompts/direction)

- **Persona is medium**; anonymity; multiple projects / collectives under one
  name.
- **Lore & universe-building**, self-referential, derivative-by-design (assets
  shared and remixed across projects - "a Katamari Damacy of internet art").
- **Transgressive humor**, irony, the absurd; "never minting out" as a badge.
- Memecoins / trading-as-muse; Solana-centered; grassroots vs. corporate PFP.

## How it maps to Series Forge

| Genre trait                        | Series Forge feature |
|------------------------------------|----------------------|
| Layered generative collage         | Stack/Scatter layouts + Fragments + seeded RNG |
| Schizocollage / trait-maxing       | High Fragments + high Detail |
| Appropriation of disparate sources | Library from Pinterest + Source pool / mood boards |
| Obscuring / distorting the subject  | **Subject mode + Alter** + Decay/Glitch |
| Distortion / abuse / AI artifacts  | Decay pipeline + Glitch + Degradation |
| Chance / automatism                | Reseed mode |

## Curator scoring profile (derived from the above)

Weighted toward the genre's VISUAL core (see gallery.js `scoreAesthetic`):

- **maximal** (schizocollage density: detail + fragment count) - high weight
- **disrupt** (subject obscured/distorted: subject + alter + decay/glitch) - high
- **collage** (layered blending: stack/scatter + fragments) - high
- **distort** (glitch + decay) - medium-high
- **color** (saturation/colorfulness) - LOW (genre spans pastel Milady to lurid)
- **contrast** - low

Note (correction): our first pass over-weighted vivid colour + holographic
sheen. The article makes clear the genre is defined more by **maximal layered
collage that disrupts a subject** than by colour intensity. Weights adjusted
accordingly - tune in `CURATE_WEIGHTS` if Fasab's eye disagrees.

---

## Source 2 additions

Source: "The Rise of the Avant Gay Art/Tech Movement on Solana" by Ryan
Bethencourt, *Grey Area Labs*, 3 Sep 2025. Reinforces Source 1 and adds detail.

**Framing:** a **Solana "punk rebellion"** - raw, chaotic, outsider art, a
reaction against Ethereum's polished "fine art" ("glowing lines and tessellating
shapes"). Descends from **net art, Tumblr-era, seapunk & vaporwave**. "Iteration,
irony, and internet."

**Traitmaxxing -> illegibility (key visual mechanic):** start from the PFP/avatar
bust, then "go completely insane with it" - hundreds of traits compiled by code
(Hashlips) into "hyper-layered, densely collaged images" so overloaded that the
original avatar becomes **"completely illegible,"** dissolving into "pure chaos."
(This is exactly our Subject + high Alter + high Fragments + Decay.)

**Concrete collage ingredients (great for prompts):** neon text, 3D render
fragments, anime eyes, pixels, memes - "all piled on." A deliberately
**"ugly"/amateur/DIY** look: glitchy filters, MS Paint-style drawings, gaudy
retro 3D renders. Neon-pink collages of anime eyes, pixelated horses, cryptic
memes.

**Sensibility:** camp, queer, gender-playful, homoerotic undertones; cute +
transgression (Milady's "innocence and transgression"); dystopian-yet-playful;
dreamy/surreal/cosmic. Non-human avatars count (even a toy car has a persona).
AI + hand-drawn blend; "vibe coding" (describe it, let an AI generate it).

**Spectrum reaffirmed:** not everything is maximal - some work is sketchy,
nostalgic, pared-down. Maximal-illegible is the iconic pole, not the only one.

**Still NOT pixel-scoreable:** the queer-punk community ethos, lore, personas,
Solana/anti-fine-art politics, "no profit motive" vibe. Captured here as
direction for prompts + project intent, not for the numeric scorer.
