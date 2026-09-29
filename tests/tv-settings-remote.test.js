import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('TV settings remote behavior and performance', () => {
  it('exposes a TV back handler and Android consumes hardware back through it', () => {
    const panel = read('src/tv/SettingsPanel.jsx');
    const activity = read('android/app/src/main/java/com/ibrokhimel/namozvaqtlari/MainActivity.java');

    expect(panel).toContain('handleBack');
    expect(panel).toContain('endEdit(true)');
    expect(panel).toContain('s.pending');
    expect(activity).toContain('OnBackPressedCallback');
    expect(activity).toContain('window.tvSettings.handleBack');
  });

  it('keeps the focused settings row away from the fixed header while scrolling', () => {
    const panel = read('src/tv/SettingsPanel.jsx');
    const css = read('src/tv/settings.css');

    expect(panel).toContain('ensureFocusVisible');
    expect(panel).toContain('topPad');
    expect(css).toContain('overflow:hidden');
    expect(css).toContain('padding-top:0');
  });

  it('bumps the displayed app version above 2.5.0 for update detection', () => {
    const pkg = JSON.parse(read('package.json'));
    const gradle = read('android/app/build.gradle');

    expect(pkg.version).toBe('2.5.1');
    expect(gradle).toContain('versionName "2.5.1"');
    expect(gradle).toContain('versionCode 2');
  });

  it('uses low-cost TV visuals instead of heavy motion/canvas effects', () => {
    const sky = read('src/tv/sky/Sky.jsx');
    const scene = read('src/tv/sky/scene.js');
    const css = read('src/tv/settings.css');

    expect(sky).not.toContain('motion.img');
    expect(sky).not.toContain('startPrecipitation');
    expect(scene).not.toContain('requestAnimationFrame');
    expect(css).not.toContain('cubic-bezier');
  });
});
