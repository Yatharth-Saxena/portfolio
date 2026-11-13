# m13: Otto's tour, as dimensions

m12 brought into whole worlds. You scroll; Otto flies you through five dimensions. Each one is a world
with its own palette, light and atmosphere, and the content physically lives in it: real photos in thick
glass slabs, big numerals standing in space, labels pinned to things on hairline leaders. The camera
travels through each set from one thing to the next. Nothing arrives as a flat grid. Kept from m12: the
lean post chain and adaptive quality, Otto (boot, thrusters, steady lights), the glass shader, the cursor
distortion, the launch dimension.

User asks this round (2026-11-12):
- Portal transitions felt snappy, and must not announce the section coming next. So: no chapter card, no
  ribbon phrases, no hyperspace burst, no auto-scroll rescue.
- Every section is a dimension you explore, with its items physically there. The reference
  (ysuriadesign.co) does this with a full set per chapter.
- Show things with images, not drawn stand-ins. QuickBite and Aethon come from his LinkedIn posts if he
  signs in to the pane; otherwise stock stand-ins.

## Transitions: the wormhole
Otto flies into the gate (the assembling hull tunnel from m12). The event horizon swallows the camera, and
you are inside a tube of light on a gentle S-curve. Its filaments flow past, never flicker, and their
colour turns from this dimension's tint to the next one's. Your scroll drives the trip at an even speed.
The world swaps while you are inside, and the far mouth opens onto the new dimension. Coming out, its fog
clears. The next dimension's textures are uploaded during the tunnel, so there is no hitch.

## Scroll timeline
A list of keyframes (s in screens, u on Otto's route). u(s) is a monotone cubic through them, so you
cross portals at an even speed and stop only at holds. During a hold the camera still drifts 10 to 20%,
so a scroll tick never does nothing.

| Segment | Screens |
|---|---|
| Boot | 1.0 |
| Launch flight to the gate | 1.0 |
| Each tunnel | 1.2 |
| Arrival to the first beat | 0.5 |
| Each beat hold | 0.55 |
| Between beats | 0.6 |
| Last beat to the gate | 0.8 |

Total is about 27 screens.

## Dimensions
0. **Launch orbit** (unchanged): the night planet at dawn, the pad, Otto's wake-up.
1. **Hello, "Origin"** (cobalt night)
   - The set: a still sea of liquid chrome reflecting the sky, and the ringed giant setting on the horizon.
   - Yatharth stands on the sea: his cutout as a crisp CSS3D billboard with a soft reflection. Otto is
     beside him, and the camera stays mostly in front of him.
   - The headline block: name, line, Start a project, Resume.
   - Beats: (a) far and low over the sea; (b) close.
2. **About, "Proof"** (gold dusk)
   - A low sun and gold dust.
   - Three numerals stand on rock islands at different depths as CSS3D sprites, so they parallax:
     "2" (sites for paying clients), "3" (Rank in Software, SIH 2026), "8.40" (CGPA, B.Tech CSE).
   - The statement is the headline.
   - Beats: wide with the statement and the 2; then the 3; then the 8.40.
3. **What I make, "The Orrery"** (violet nebula)
   - Five photo slabs orbit a small star on tilted rings, and the camera circles them.
   - Pins carry the title, one line and the tech icons.
   - Beats: Websites and Online stores; Apps and APIs, and 3D and motion; Voice AI.
4. **Work, "The Gallery"** (deep blue)
   - Four big photo slabs hang in a slow arc, each under a soft spotlight cone with dust in the beam.
   - Pins carry the name, line, badges and links.
   - Beats: one per project.
5. **Let's talk, "The Signal"** (silver dawn)
   - The chrome orb in its dust ring sends slow pulse rings outward, easing out, never flashing.
   - The form console (DOM glass), reach links and footer.
   - Beats: the orb wide; then the form.

## Images (m13/img, credits in m13/img/credits.json; footer credit line)
| Item | Picture | Licence |
|---|---|---|
| Websites | laptop-and-a-mug-unsplash.jpg | CC0 |
| Online stores | shopping-cart-supermarket.jpg | CC0 |
| Apps and APIs | code-on-computer-monitor-unsplash.jpg | CC0 |
| 3D and motion | blender-donut.png | CC BY 4.0 |
| Voice AI | neumann-u87-condenser-microphone-studio-a-in.jpg | CC BY-SA 2.0 |
| Client e-commerce | business-professional-engages-in-online-shopping-from.jpg | CC BY 2.0 |
| Aethon | LinkedIn post image; stand-in sts-134-international-space-station-after-undocking.jpg | public domain |
| QuickBite | LinkedIn post image; stand-in takeaway-food-counter-with-latitude-longitude-display.jpg | CC BY-SA 2.0 |
| Jarvis | amazon-echo-dot-virtual-digital-assistant-with.jpg | CC BY-SA 4.0 |

Never show the Aashi or Drona sites, in any form. Photos are corrected for AgX tone mapping in the slab
shader.

## Element checklist (everything m12 has must still exist)
- **HUD:** wordmark (to Hello); nav (Work, About, Contact, Sound toggle, Start a project); location and
  live time; the "Scroll to wake Otto" cue; subtitles; Ask Otto chips; rooms nav with aria-current;
  "Skip the wake-up".
- **Gate:** the loader, "Hi, I'm Otto", the Start button, the flat-version link.
- **Hello:** the name, "Full-stack developer" lead, the freelance note, Start a project, Resume, the
  portrait.
- **About:** the statement, with "Smart India Hackathon" accented; the three stats and their captions.
- **What I make:** five items, each with its icons and one line.
- **Work:**
  - Client e-commerce: its line, four feature marks, four tech marks, Aashi (live) link, Drona
    (launching) link.
  - Aethon: Rank 3 · SIH 2026 badge, line, flow (Speech, Local LLM, Voice, React, Three.js), code link.
  - QuickBite: Finalist · VibeCon badge, line, flow (Walk-in queue, Pickup time, React, Node, Express),
    code link.
  - Jarvis: Side project badge, flow (Speech to text, Python, Text to speech), line.
- **Let's talk:** heading, lead, form (sends to WhatsApp), Email, WhatsApp, LinkedIn, GitHub, footer
  with resume and flat-version links, and the image credits.
- **Behaviour:** the voice line on arriving in each dimension; the chips change per dimension; goRoom
  jumps to a dimension's first beat.

## Realism pass (same day: "nothing cartoonish anywhere, and it must not lag")
- **Wormhole walls:** the real sky (the baked nebula) is lensed into the throat and smeared by speed. Thousands
  of thin starlight streaks follow a steep brightness power law. A soft gas drifts through. It is seen from
  outside only through the gate's horizon, which is a stencil mask.
- **Horizon:** a lensing throat. The sky is bent round the opening, a thin photon ring burns at the rim, and the
  centre is dark.
- **Gate:** the gyro rings are machined metal, and the strips are faint marker lights, not light bars.
- **Stars:** tiny sharp points in blackbody colours, almost all faint. Fine diffraction spikes on the brightest
  only. No twinkling.
- **Asteroids:** dark, rough, cratered rock, with a few metallic ones, baked once.
- **About islands:** dense noise-sculpted basalt with dusty tops, dark hollows and hanging roots.
- **Orrery:** a granulated star with a corona; its rings are orbiting dust.
- **Light cones:** broken-up, dusty haze.
- **Nebulae:** wispy filaments.
- **Grades:** cinema-subtle.
- **Numerals:** polished metal lettering, a gradient fill only.
- **Performance rule:** no CSS filter on anything in the CSS3D layer. It is repainted every frame, and a single
  drop-shadow halved the frame rate.

## Refinement round (2026-11-12/13: "portrait clearly visible, Hello realistic, Otto narrates part by part")
- **Hello is a night orbit over India.**
  - Below: NASA's Black Marble ("The earth at night", public domain). A sharp crop over India (50E to 110E, 0 to 50N, `img/earth-india.jpg`) sits over a small global map.
  - The sphere is turned so that Delhi, his home region, lies just below the horizon under his portrait. The angle is worked out from the camera's stop beside him (`backdrops.js` `nightEarth`).
  - The moonlit land stays near black, and the cities carry the light.
  - The limb has the real 557.7 nm green airglow line at about 100 km, a much fainter red layer above it, and a faint dawn to the right.
  - Above, rising from behind the horizon on the left: ESO's Milky Way photograph (S. Brunier, CC BY 4.0, `img/milky-way-eso.webp`). The sky's grey is subtracted, the ends are feathered, and it is placed clear of his face.
- **His star portrait** is error-diffused (serpentine Floyd-Steinberg) on a grid sized for about 2 screen px per star at the close stop. 560 rows on LOW give about 36k stars, instead of 157k random ones.
  - Tone is carried by star density, so the face reads cleanly: glasses, eyes and teeth all resolve.
  - A rim of starlight outlines his hair and shoulders.
  - Hair and jacket keep a sparse field of cool stars, with a few brighter ones.
  - The open collar is dimmed, so it no longer glows as a column.
  - Stars still stream in from the whole sky as you come out of the wormhole.
- **Otto as a guide** (`guide()` in tour.js, `GUIDE` in src/data.js):
  - In each dimension he speaks one line on arrival, then one line for each stop the camera makes.
  - If he is still talking when the next stop comes, that line waits. It plays only if the stop is still in view when he finishes.
  - Nothing replays, and a fast scroll leaves no backlog.
  - `say()` drops a line superseded while its clip loads, and `sound.speak` never lets an older clip play over a newer one.
  - Voices are generated by `npm run voice` (Kokoro), with the new ids in `public/voice`.
- **Performance** (headless Chrome on the Intel UHD at 1536x864, DSF 1.25):
  - **FXAA removed.** It cost about 3.8 ms, more than the whole final pass. In its place, the final pass smooths along edges it detects from the neighbours it already reads for the sharpen. Gain: +5 to 7 fps.
  - **The crisp layer's canvas is only as big as its content.**
    - A full-screen transparent canvas cost 6 to 9 fps even when empty.
    - The canvas now covers the screen rectangle of the visible photos and portrait. It renders that region through `camera.setViewOffset`, moves with a CSS transform, and hides when nothing is on screen.
    - Result: Work and Make at 60 fps static, Hello about 52.
  - **Make's voice stop is 11 units from the orrery's star.** Its glow sprites and full brightness veiled the whole frame through bloom and cost fill. Both now ease down near it, as a camera's exposure would: 25 fps went to 37 to 39 with the mouse moving.
  - **With the mouse moving:** Hello 37, About 39, Make 37 to 39, Work 36 fps.
  - **Measurement:** leftover headless Chrome processes from interrupted runs had been dragging every earlier measurement down. Kill them before measuring.
- **Late fixes in this round:**
  - **Route path in Hello.** The star-dust route path is off in Hello. Its band edges lay across the Earth as two dotted lines, with stray points over the sea.
  - **Exit gate assembly.** The exit gate starts assembling at 70 units (was 92), and its plates fly in from 40 to 80 units out (was 22 to 48). They no longer drift as dark blocks round his face or the About numbers.
  - **No narration while racing past.** Otto starts no line while the camera is racing past (`spK` > 0.45). A nav or "Start a project" jump through other dimensions stays silent until it lands, and only the destination's line plays.
  - **Edge filter.** It uses two pairs of taps along each edge, at 0.75 and 1.75 texels. A 3x crop of Otto shows it as smooth as the old FXAA.

## Orbit, glow and location round (2026-11-13)
- **What I make is an orbit.**
  - The camera circles the star (`DIMS[3].orbit`, radius 21) and stops at 18, 92 and 166 degrees.
  - Between stops it sweeps the arc while looking at the star (`beatCam` orbit branch). Near a stop it drifts along the arc and never pushes in.
  - The five photos sit on the middle ring (radius 10.5), one up-left and one down-right of the star at each stop, each facing its stop. The next ones turn into view from the side as you go round.
  - Otto waits between the camera and the star, whole and above it. His route between stops arcs over the ring (via points at radius 13.5, 4 up).
  - The labels hang off the outer corners, away from the star.
- **Hover glow.** It is one continuous light that peaks on the pane's edge and fades both ways: 9 px into the glass, 14 px out. It is softer in colour (saturation .42), with no thin line of its own, so it no longer reads as a second border floating off the tile.
- **Location notification instead of standing headings.**
  - The heading cards (Hello's hero, About's statement, What I make, Work) no longer stay on screen through every stop. They are visually hidden and remain in the page for screen readers.
  - On coming out into a dimension (not while racing through one), its name drops in at the top centre like a phone notification. A small glass bubble drops, spreads sideways into a capsule on a spring as the words rise from the centre, holds about 3 s, then folds back and lifts away.
  - The text comes from `data-loc`/`data-sub` on each section. The capsule is a `.glass` pane, so it gets the real WebGL frosted body. Built with motion springs (`showLoc` in tour.js).
  - Hello's line, note and buttons (Start a project, Resume) moved into a tile beside the portrait's shoulder at the close stop.
  - Let's talk keeps its form card; it is the content, not a heading.

## Scroll stops, guide timing, inset photos, new pictures (13 Nov 2026)

- **Scroll in detents** (`tour.js`, after `goRoom`): `STOPS` are each beat's hold centre plus a stop just past every
  portal's mouth (`ARRS`, 0.12 screens after arrival; exactly at the mouth the camera never quite left the wormhole).
  The wheel moves freely between stops, but a stop catches it: the rest of that flick and any trackpad momentum is
  dropped. Release needs 650 ms there, the camera to have arrived, and then a pause (350 ms) or a push that builds
  instead of fading. Going back always lets go. Arrow keys, Page Up/Down and Space go stop to stop.
- **Otto in step with the view** (`guide`): he speaks about what is in front of you now. A new view cuts the line
  before it (with an 80 ms fade in `sound.js`) unless it ends within 0.7 s; leaving something and coming back makes him
  say it again; the arrival line plays only when you come out of a portal, not when backing towards it.
- **Photos inside their frames** (`dims.js` `slab`): an extruded frame with an opening; the photo sits 0.1 deep
  behind its lip. In the crisp layer the lip is worked out per pixel (`INSET_F`), with wall shading and a glass sheen.
- **New pictures**: Make's websites/stores/3D tiles are real device photos with screens set into them
  (`lab/compose.html`: his own site, a sample shop page `lab/screens/store.html`, Otto in `lab/screens/viewer.html`);
  apps, voice, client stores (a parcel van at night) and Jarvis (a condenser mic) are straight photos. Sources and
  licences in `m13/img/credits.json`; originals in `m13/img/src/`. The old stock files are still in `m13/img/`, unused.
- **Otto concepts**: `lab/otto-concepts.html?c=scout|field|sleek|vanguard|apex|current` (drag to orbit), renders and
  sheet in `mockup-shots/otto-concepts/`. These are code-built direction sketches, not final models.

## Otto, Field edition, and his voice (13 Nov 2026)

- **Model** `m13/otto-field.js` (chosen from the concept sheet): same controls as `m7/otto3d.js`, so the tour's flight,
  wake-up, thrusters and lights work unchanged. Face drawn on the visor in a shader: two LED eyes with expressions
  (happy, excited, focus, worried, curious: preset eye shapes blended), blinks, a 7-bar voice meter for a mouth.
  Hands with two-jointed fingers and a thumb. Spring physics from his real acceleration: antenna, head, arms,
  backpack, knees. In flight his wrists turn his palms down onto their thrusters (`arms[i].palm` mounts).
- **Director** (`tour.js`, `LINE_ACT` / `startAct` / `direct`): each line has a lead gesture (point / present at the
  pins of the stop it is about, two tiles in turn; open arms for a new place; hand to chest about himself) and an
  expression, then beats with his voice. He turns partly toward what he shows; never reaches behind his back. Flying
  makes him focused; diving, excited. At a stop he faces you (the look target's sideways part only).
- **Test stage**: `lab/otto-concepts.html?c=live&close` (cycles expressions and gestures; `&e=happy&g=point&ax=..`).
- **Voice**: `scripts/otto-speak.mjs`: the name fixed at phoneme level (YATH-arth / sax-EE-nuh to yuh-THAARTH /
  suk-SAY-naa), each sentence spoken on its own with a 0.36 s pause (0.42 after ? and !), speed 0.94. New clips play at
  true speed (manifest `rate: 1`); the old ones were sped up 1.13x, which made him sound rushed. Samples in six voices:
  `node scripts/voice-samples.mjs`, page `lab/voices.html`. Regenerate the site's lines in the chosen voice with
  `OTTO_VOICE=<id> npm run voice`.
- **Round 2 (Yatharth's notes)**: the wave was rebuilt (upper arm out just below level, forearm up, palm to you,
  swinging from the elbow with a little wrist give; it used to swing the arm over and behind the head with the hand
  twisted back). The tour's old "hover" arm override, which pulled every gesture 80% back to a fixed pose, is gone.
  Hand-to-chest now turns the shoulder in its socket (`shoulder turn`, 8th gesture value) so the forearm crosses the
  chest. Waving is a line's gesture (`m13-5-0`, the wake-up), not constant in Let's talk. Every gesture checked from the
  front (`lab/otto-concepts.html?c=live&ry=0&g=...`).
- **Voice**: Fable (`bm_fable`). No "Saxena" in anything he says. Pacing per sentence (questions lift, short lines
  land slower, a breath at a dash/colon/semicolon, a longer beat before the last sentence). The manifest keeps each
  sentence's start and end (`seg`); subtitles show one sentence at a time from those timings, words lighting in
  proportion to their length, and his mouth stays still in the pauses.

## Sound, and the voice made friendlier (13 Nov 2026)

- **Name, again**: Fable is a British voice, and British phonemes spell the name jˈaθɑːθ (another a, no r), which the
  first fix (written for American jˈæθɑːɹθ) missed. `NAME_FIX` now catches both, always giving jəθˈɑːɹθ (type A).
- **Voice**: a blend of Fable (70%) and Puck (30%) style vectors (`useVoiceMix` in scripts/otto-speak.mjs), British
  phonemes; pace 1.06 with shorter pauses (0.27 s, 0.4 after a question): 2.84 words a second, was 2.42.
  Other blends to compare: `node scripts/voice-mix-samples.mjs`, page `lab/voices.html`.
- **Wake-up pace**: the boot stretch of the scroll is capped to about six seconds however hard you scroll (`BOOTPACE`;
  the skip button runs it at about 1.4 s); subtitles lift above the "Scroll to wake Otto" cue while it shows.
- **Soundscape** `m13/soundscape.js`, all synthesised, driven from `frame()`:
  beds per world (Launch pad: 50 Hz hangar hum; Hello: A major add9 pad, a high shimmer, the Earth's rumble, glass
  bells; About: D dorian pad and drone, gusting stereo wind, wooden chimes; What I make: E lydian, the star's plasma,
  the rings sweeping past, a soft bell arpeggio; Work: C minor 9, a 66 bpm heartbeat, telemetry ticks; Let's talk:
  F major 7, the orb's hum, a far-off sea), crossfading, ducked under his voice.
  The trip: a rise as a portal nears, the impact going in, a rotating tunnel over a Shepard tone, a bloom coming out
  in the new world's key (crossings detected both ways). The notification: a drop and a two-note chime; folding, a
  breath. Otto: thruster rumble and hiss panned to him, air at speed, servo whirrs on his main gestures, a power-up.
  Levels (offline render, `lab/sound-preview.html`): worlds about -26 dB, tunnels -21 dB, peaks 0.69, no clipping.
- **Round 4 fixes**: the sound broke up in flight and coming out of portals. The Shepard tone's voices all wrapped
  down an octave at once every few seconds (now each wraps alone, silently, at the top); the next world's sound was
  built in the exit frame (now built silently as its portal nears); there was no limit on voice plus soundscape (now
  a safety limiter on the whole output, gentler limiting in the soundscape). Offline render: no clicks in any stretch.
  Body: antenna moved onto the helmet; shoulder pads mounted on the chest, following the arm partway; taller neck
  and head pitch limits; arms hang clear of the chest; shorter elbow armour; a gentler powered-down crouch; `post()`
  enforces the limits after the tour's own adjustments. "live" is spoken as "lyve" (subtitles keep "live"); sentences
  split only at a stop followed by a space (never inside aashienterprises.store, Three.js, 8.4). Icon rows in tiles
  wrap inside their card (audit: nothing outside any tile).
- **Round 5 (sound that cannot break up)**: the soundscape is baked. Every world bed (20 s seamless loops at
  12 kHz), bell, chime, impact, bloom, servo and every texture of motion (air, rumble, hiss, tunnel, riser, the
  endless rise as an exactly periodic 8 s loop) is rendered once by OfflineAudioContexts, two at a time, in the order
  needed (`warmSoundscape()`, 2.5 s after load; about 5 s on an idle page). Live there are only looping clips, gains
  and playback rates, sent to the audio thread only when they change; one-shots are spaced (the exit bloom waits for
  the impact) and capped. Audio-thread work on a fast run through four portals (`lab/sound-bench.html`): old engine
  206-222 ms per second of sound, now 15-17 ms. The AudioContext uses latencyHint "playback" (about 68 ms headroom).
- **Wake-up camera** re-aimed for Field Otto (`BOOTCAM`): his eyes are the first light (visor at y 1.6 while bowed);
  the scan ring is sized to him and dimmed (passing the camera, its bloom flooded the frame white).
- **Round 6**: "live" now really is said "lyve": the respelling's regex had lost its \b word boundaries (a shell turned
  them into backspace characters), so it never matched; fixed, the five lines regenerated, and clip URLs now carry the
  clip's hash (`?v=`) so a regenerated clip is never played from cache. A custom cursor (`m13/cursor.js`): dot and a
  trailing ring; over buttons and links the ring becomes a highlight round the element (its corners too) and the
  control leans toward the pointer; a swelled circle over tiles, a caret over the text field, a squeeze on press, a
  ripple on click; real mouse only, still under reduced motion. Question chips sit at the left under 1500 px wide
  (they ran into the section menu at 1280).
- **Round 7**: the idle flicker was the bloom: its bright pass read one tap per 4x4 pixels, so glints moving by less
  than a pixel (Otto breathes) pulsed the glow; it now reads a 13-tap Karis-weighted footprint. Idle intro before:
  single-frame jumps to 37-40 (from 28) every few frames; after: steady (only his blink). Also: render-quality changes
  now happen before drawing (a resize after drawing left a blank frame), with hysteresis (2 slow windows down, 4 fast
  up, 4 s apart, not up within 20 s of a drop). The cursor looks again at what is under it 8 times a second and after a
  click, and ignores anything faded, hidden, switched off or inside `.gone` (the Start button's ring no longer stays).
  A custom scrollbar (`m13/scrollbar.js`): a marker per world, the thumb follows the eased journey and trails a comet
  in flight, markers pop as you reach them, labels on hover, click to go, drag to scrub; the native one is hidden.

## Round: production and phones (2026-11-13)
- Red is the site's colour (set on `<html>` before the first paint); `?c=blue` shows cobalt.
- Phones (touch, short side under 700 px) get the light tier, like the reference site: no MSAA, lighter bloom, fewer
  particles, at most 1.25 pixels per CSS pixel. Tablets render at up to 1.5.
- Touch screens measure the journey in the large viewport's height (`VP`), so a phone's sliding address bar never
  moves the journey or resizes the renderer.
- Touch screens page from stop to stop: a swipe moves on (or back) one stop and the journey flies there (at most
  2.6 screens a second). The browser's own scroll snapping was tried first and dropped: a gentle swipe sprang back
  from stops up to 2.3 screens apart.
- On a tall screen the camera widens (`fitFov`, up to about 76°). On an upright phone it also tilts down a little in
  worlds 1 to 4, so the things shown ride above the labels.
- Compact layout (under 760 px wide, under 520 px tall, or an upright touch tablet): a slim bar; the place name under
  it; the labels gathered in a band at the bottom (stacked upright, in a row sideways) with leaders up to their dots;
  subtitles and a sideways-scrolling row of questions below; the rail as the menu. On a laptop a label that would
  leave the screen is pulled back inside, and nothing else changes.
- The keyboard on the contact field holds the journey still. A lifted finger leaves no tilt or lit glass. If the
  browser drops the 3D and does not restore it, a notice offers a reload.
- Without WebGL 2 or without script, the gate shows a plain card with the contact links and resume. A "short version"
  link appears there if loading takes over 20 s.
- The flat version (/m10/) links are gone.
- Build: `npx vite build` writes `site/` (the tour as `index.html`, code in `/_app/`, `_headers`, `robots.txt`) and
  copies only an allowlist. public/img holds client-site previews and is never published.
