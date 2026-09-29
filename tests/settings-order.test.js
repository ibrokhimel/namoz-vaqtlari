import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('settings order', () => {
  it('puts mosque-name settings at the bottom of the phone settings page', () => {
    const html = read('settings.html');

    expect(html.indexOf('Joylashuv')).toBeLessThan(html.indexOf("Masjid Ma'lumotlari"));
    expect(html.indexOf('Hijriy Sana Sozlamasi')).toBeLessThan(html.indexOf("Masjid Ma'lumotlari"));
    expect(html.indexOf("Masjid Ma'lumotlari")).toBeLessThan(html.indexOf('saveBtn'));
  });

  it('puts TV mosque-name rows at the bottom before actions', () => {
    const panel = read('src/tv/SettingsPanel.jsx');

    expect(panel.indexOf("label: 'Shahar'")).toBeLessThan(panel.indexOf("label: 'Masjid nomi'"));
    expect(panel.indexOf("key: 'hijriAdj'")).toBeLessThan(panel.indexOf("label: 'Masjid nomi'"));
    expect(panel.indexOf("label: 'Arabcha nomi'")).toBeLessThan(panel.indexOf("id: 'update'"));
  });
});
