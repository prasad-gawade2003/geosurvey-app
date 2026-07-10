/**
 * GeoSurvey Pro — Icon Generator Script
 * Run with: node generate-icons.js
 * Generates all required PWA icon sizes as canvas-drawn PNGs
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

SIZES.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(1, '#ea580c');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Pin shape
  const cx = size / 2;
  const py = size * 0.25;
  const pr = size * 0.22;
  const pb = size * 0.82;

  ctx.beginPath();
  ctx.arc(cx, py + pr, pr, Math.PI, 0);
  ctx.bezierCurveTo(cx + pr, py + pr * 1.5, cx + pr * 0.3, pb - pr * 0.4, cx, pb);
  ctx.bezierCurveTo(cx - pr * 0.3, pb - pr * 0.4, cx - pr, py + pr * 1.5, cx - pr, py + pr);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(cx, py + pr, pr * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#f97316';
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(OUTPUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated: icon-${size}.png`);
});

console.log('\n🎉 All icons generated in ./icons/ folder!');
