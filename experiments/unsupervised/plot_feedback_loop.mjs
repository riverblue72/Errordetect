import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const base = path.dirname(fileURLToPath(import.meta.url));
const results = path.join(base, 'results');
const runs = [
  ['Development', 'interval_feedback_mixed_dev2.json'],
  ['Later interval', 'interval_feedback_future.json'],
].map(([name, file]) => [name, JSON.parse(readFileSync(path.join(results, file), 'utf8'))]);

const methods = [
  ['frozen_active', 'Current', '#7386a0'],
  ['candidate_before', 'Candidate', '#d58d67'],
  ['candidate_after_conservative', 'After review', '#4f9182'],
];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 15, fill = '#243447', weight = 400) =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;

const parts = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="600" viewBox="0 0 1120 600" role="img" aria-labelledby="title desc">',
  '<title id="title">Reviewed candidate on two later test intervals</title>',
  '<desc id="desc">For each run, bars compare detected defect frames and flagged normal frames for current, candidate, and after-review models. Exact counts are printed beside every bar.</desc>',
  '<rect width="1120" height="600" fill="#f8faf9"/>',
  text(42, 47, 'Interval feedback · same-frame comparison', 23, '#243447', 500),
  text(42, 73, 'Higher detection and fewer false alerts are preferable.', 14, '#667583'),
];

for (let row = 0; row < runs.length; row++) {
  const [runName, result] = runs[row];
  const y = 120 + row * 246;
  const values = methods.map(([key]) => result.test[key]);
  const defectTotal = values[0].anomalies;
  const normalTotal = values[0].count - defectTotal;
  parts.push(`<rect x="30" y="${y - 27}" width="1060" height="226" rx="12" fill="#ffffff" stroke="#e1e8e6"/>`);
  parts.push(text(49, y, `${runName} · ${result.protocol.target}`, 17, '#243447', 500));
  for (let col = 0; col < 2; col++) {
    const x = 49 + col * 530;
    const key = col === 0 ? 'tp' : 'fp';
    const total = col === 0 ? defectTotal : normalTotal;
    const max = col === 0 ? total : Math.max(1, ...values.map(item => item.fp));
    const title = col === 0 ? `Defect frames detected / ${total}` : `Normal frames flagged / ${total}`;
    parts.push(text(x, y + 31, title, 14, '#667583', 500));
    for (let i = 0; i < methods.length; i++) {
      const [, label, color] = methods[i];
      const count = values[i][key];
      const by = y + 54 + i * 42;
      const width = Math.max(count > 0 ? 2 : 0, 270 * count / max);
      parts.push(text(x, by + 18, label, 14));
      parts.push(`<rect x="${x + 126}" y="${by + 2}" width="270" height="21" rx="3" fill="#edf1f1"/>`);
      if (width) parts.push(`<rect x="${x + 126}" y="${by + 2}" width="${width.toFixed(2)}" height="21" rx="3" fill="${color}"/>`);
      parts.push(text(x + 410, by + 18, count, 15, '#243447', 500));
    }
  }
}
parts.push('</svg>');
writeFileSync(path.join(results, 'feedback_loop.svg'), parts.join('\n') + '\n');
