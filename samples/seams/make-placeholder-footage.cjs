const { chromium } = require('playwright'); const fs = require('fs');
const scenes = [
 { name: 'f0', bg: ['#FF8A65', '#D84315'], label: 'SHOT A', objs: [] },
 { name: 'f1', bg: ['#26C6DA', '#00695C'], label: 'SHOT B', objs: [{ x: 540, y: 820, d: 420, c: '#E0F7FA', rim: '#004D40' }] },
 { name: 'f2', bg: ['#5E35B1', '#1A0B3D'], label: 'SHOT C', objs: [{ x: 330, y: 1250, d: 260, c: '#FFD54F', rim: '#FF8F00' }] },
 { name: 'f3', bg: ['#FFF176', '#F9A825'], label: 'SHOT D', objs: [{ x: 700, y: 700, d: 520, c: '#FF7043', rim: '#BF360C' }] },
 { name: 'f4', bg: ['#81C784', '#1B5E20'], label: 'SHOT E', objs: [] },
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const s of scenes) {
    const data = await p.evaluate((s) => {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 1080, 1920); gr.addColorStop(0, s.bg[0]); gr.addColorStop(1, s.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920);
      g.globalAlpha = 0.12; g.fillStyle = '#fff'; for (let i = -20; i < 40; i++) { g.save(); g.translate(i * 90, 0); g.rotate(0.35); g.fillRect(0, -200, 28, 2600); g.restore(); }
      g.globalAlpha = 1; for (const o of s.objs) { g.beginPath(); g.arc(o.x, o.y, o.d / 2, 0, 7); g.fillStyle = o.c; g.fill(); g.lineWidth = 18; g.strokeStyle = o.rim; g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 120px sans-serif'; g.fillText(s.label, 80, 1760);
      return c.toDataURL('image/png');
    }, s);
    fs.writeFileSync(`assets/${s.name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close();
})();
