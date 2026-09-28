import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITIES, DEFAULT_SETTINGS, appNow, decimalToDate, decimalToHHMM, getTimesForDate, initSimulationFromURL, parseWallTime, setSimulatedClock, simulation } from '../src/core/prayer.js';
import { countdownParts, dayPhase, forDay, getDayState, isRamazon, makruhEnd } from '../src/core/day.js';

const settings = { ...DEFAULT_SETTINGS, adjustments: { ...DEFAULT_SETTINGS.adjustments } };
const city = CITIES.Tashkent;
// A Date whose local fields read the given Tashkent wall time (what appNow() yields)
const at = (y, mo, d, h, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

describe('formatting', () => {
  it('never loses a minute to float error', () => {
    expect(decimalToHHMM(16.3)).toBe('16:18');
    expect(decimalToHHMM(NaN)).toBe('--:--');
    expect(decimalToHHMM(24.5)).toBe('00:30');
  });
  it('rounds prayer times to whole minutes', () => {
    const T = getTimesForDate(at(2026, 9, 28, 12), settings, city);
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(decimalToDate(T[k], at(2026, 9, 28, 0)).getSeconds()).toBe(0);
    }
  });
});

describe('getDayState (Tashkent, 28 Sep 2026)', () => {
  it('14:20: Peshin current, Asr next', () => {
    const st = getDayState(at(2026, 9, 28, 14, 20), settings, city);
    expect(st.current.key).toBe('dhuhr');
    expect(st.next.key).toBe('asr');
    expect(st.started).toBeNull();
  });
  it('after sunrise no prayer is current until Peshin', () => {
    const st = getDayState(at(2026, 9, 28, 8, 0), settings, city);
    expect(st.current).toBeNull();
    expect(st.next.key).toBe('dhuhr');
  });
  it('after Xufton the next prayer is tomorrow\'s Bomdod', () => {
    const st = getDayState(at(2026, 9, 28, 22, 0), settings, city);
    expect(st.current.key).toBe('isha');
    expect(st.next).toMatchObject({ key: 'fajr', tomorrow: true });
  });
  it('announces a prayer for 5 minutes after it begins', () => {
    const T = getTimesForDate(at(2026, 9, 28, 12), settings, city);
    const asr = decimalToDate(T.asr, at(2026, 9, 28, 0));
    expect(getDayState(new Date(+asr + 60000), settings, city).started.key).toBe('asr');
    expect(getDayState(new Date(+asr + 6 * 60000), settings, city).started).toBeNull();
  });
});

describe('special days', () => {
  it('Friday Peshin is Juma', () => {
    expect(forDay({ key: 'dhuhr', nameUz: 'Peshin' }, at(2026, 10, 2, 12)).nameUz).toBe('Juma');
    expect(forDay({ key: 'dhuhr', nameUz: 'Peshin' }, at(2026, 10, 1, 12)).nameUz).toBe('Peshin');
  });
  it('detects Ramazon 1448', () => {
    expect(isRamazon(at(2027, 2, 15, 12), settings)).toBe(true);
    expect(isRamazon(at(2026, 9, 28, 12), settings)).toBe(false);
  });
  it('makruh at zawal ends at Peshin', () => {
    const now = at(2026, 9, 28, 12, 8);
    const T = getTimesForDate(now, settings, city);
    expect(makruhEnd(now, T)).toEqual(decimalToDate(T.dhuhr, now));
    expect(makruhEnd(at(2026, 9, 28, 14, 0), T)).toBeNull();
  });
});

describe('phase and countdown', () => {
  it('follows the sun', () => {
    const T = getTimesForDate(at(2026, 9, 28, 12), settings, city);
    expect(dayPhase(at(2026, 9, 28, 14), T)).toBe('day');
    expect(dayPhase(at(2026, 9, 28, 18, 30), T)).toBe('dusk');
    expect(dayPhase(at(2026, 9, 28, 23), T)).toBe('night');
  });
  it('shows seconds only in the last 10 minutes', () => {
    expect(countdownParts((1 * 3600 + 58 * 60 + 30) * 1000)).toEqual([[1, 'soat'], [58, 'daqiqa']]);
    expect(countdownParts(42 * 60000)).toEqual([[42, 'daqiqa']]);
    expect(countdownParts((6 * 60 + 5) * 1000)).toEqual([[6, 'daqiqa'], ['05', 'soniya']]);
  });
});

describe('appNow', () => {
  afterEach(() => vi.useRealTimers());
  it('reads Tashkent wall time whatever the device zone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T09:20:00Z'));   // 14:20 in Tashkent
    const n = appNow();
    expect([n.getHours(), n.getMinutes()]).toEqual([14, 20]);
  });
});

describe('test mode (?at=...&speed=...)', () => {
  afterEach(() => { setSimulatedClock(null); vi.useRealTimers(); });
  it('parses wall times and rejects bad input', () => {
    expect(parseWallTime('2027-02-15T17:00')).toEqual(new Date(2027, 1, 15, 17, 0));
    expect(parseWallTime('2027-02-15')).toEqual(new Date(2027, 1, 15));
    expect(parseWallTime('2027-02-30T10:00')).toBeNull();
    expect(parseWallTime('tomorrow')).toBeNull();
  });
  it('starts the clock at ?at and runs it at ?speed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T09:20:00Z'));
    expect(initSimulationFromURL('?at=2027-02-15T17:00&speed=60')).toBe(true);
    expect(simulation()).toEqual({ speed: 60 });
    vi.advanceTimersByTime(10000);                       // 10 real seconds
    const n = appNow();
    expect([n.getHours(), n.getMinutes()]).toEqual([17, 10]);   // = 10 minutes later
  });
  it('a normal launch is never simulated', () => {
    expect(initSimulationFromURL('')).toBe(false);
    expect(simulation()).toBeNull();
  });
});
