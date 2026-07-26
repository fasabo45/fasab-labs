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
