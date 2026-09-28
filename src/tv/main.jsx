import { createRoot } from 'react-dom/client';
import { CITIES, appNow, getTimesForDate, loadSettings } from '../core/prayer.js';
import { dayPhase } from '../core/day.js';
import '../assets/fonts/fonts.css';
import './tv.css';
import './settings.css';
import App from './App.jsx';

// Choose day/dusk/night before the first paint, so a TV switched on at
// Bomdod never flashes the bright day palette in a dark hall.
try {
  const s = loadSettings(), now = appNow();
  document.documentElement.dataset.phase = dayPhase(now, getTimesForDate(now, s, CITIES[s.city] || CITIES.Tashkent));
} catch {
  document.documentElement.dataset.phase = 'dusk';
}

createRoot(document.getElementById('root')).render(<App />);
