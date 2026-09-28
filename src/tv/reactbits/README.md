# React Bits components

Copied from [React Bits](https://reactbits.dev) by David Haz
(github.com/DavidHDev/react-bits), JS + CSS variants:

| File | Source | Used for |
|---|---|---|
| `BlurText.jsx` | `src/content/TextAnimations/BlurText` | the next prayer's name coming into focus |

One local change, marked `[namoz-vaqtlari]` in `BlurText.jsx`: an `animateOnMount`
prop so the text plays when it mounts instead of waiting for an
IntersectionObserver. The prayer name must never stay invisible, e.g. in a
screen that starts off-view.

Licensed MIT + Commons Clause (see `LICENSE.md`): used here as part of this
application; the components are not redistributed on their own.
