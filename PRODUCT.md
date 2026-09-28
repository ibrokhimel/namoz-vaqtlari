# Product

## Register

product

## Users
Worshippers in an Uzbek mosque reading a wall-mounted TV (`tv.html`) from 3–10 m away, often older, often glancing on the way in or while waiting for jamoat. Secondary: the mosque's caretaker/imam configuring it once via `settings.html`, and individuals checking times on a phone (`index.html`).

## Product Purpose
Show today's (and tomorrow's) five prayer times, sunrise, the current and next prayer, and a countdown — accurately and legibly at a glance — for mosques in Uzbekistan. Success: anyone in the room can read the next prayer and time left in under two seconds, from the back of the hall.

## Brand Personality
Serene, reverent, dignified. Calm and spacious; Islamic geometry and calligraphy used as quiet craft, not decoration. The screen should feel like it belongs in a mosque, not on a phone store shelf.

## Anti-references
- Generic "Islamic app" look: green-and-gold, crescent clip-art, emoji icons (Muslim Pro style).
- Corporate SaaS: cold dashboard cards, stat tiles, sterile UI.

## Design Principles
1. Legible from the back row — distance readability beats density.
2. One thing matters most: the next prayer and time remaining.
3. Stillness over spectacle — motion only to signal state change.
4. Craft rooted in place — Uzbek/Central Asian Islamic visual heritage, rendered with restraint.
5. Trustworthy numbers — times must look authoritative and never ambiguous.

## Platform
Will ship as an APK for Google TV / Android TV, with the web app running inside a WebView wrapper. Consequences: the only input is the D-pad remote (no touch, mouse or hover); it must work fully offline, with fonts bundled; TV system-on-chips are weak, so motion must be cheap; the CSS viewport is often 960×540 at devicePixelRatio 2 on 1080p panels; content must stay inside a roughly 5% overscan-safe margin; and the screen stays static for hours, so burn-in has to be guarded against.

## Accessibility & Inclusion
Assumed (not yet confirmed): older viewers — very large type, high contrast (≥ WCAG AA, target AAA for times), minimal ambient motion on the TV, respect `prefers-reduced-motion`. Uzbek Latin primary, Arabic secondary.
