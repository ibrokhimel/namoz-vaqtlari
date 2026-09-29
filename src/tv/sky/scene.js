// Static weather overlay metadata kept separate from Sky.jsx so tests can
// enforce that TV weather uses low-cost still layers, not animation loops.
export const W = 1920;
export const H = 1080;

export const STATIC_WEATHER = {
  rain: 'linear rain streak overlay',
  drizzle: 'sparse rain streak overlay',
  thunder: 'rain overlay with static dimmer',
  snow: 'soft snow dot overlay',
};

export const rnd = (a, b) => a + Math.random() * (b - a);
