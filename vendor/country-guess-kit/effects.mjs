export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

export function showFloatingEmoji(emoji, { className = 'cg-floating-emoji', durationMs = 1700 } = {}) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = emoji;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

export function fireConfetti({ className = 'cg-confetti-canvas', count = 140, durationMs = 2600, colors = ['#46d391', '#f2cb57', '#78a8ff', '#ff6b6b', '#8a8f98', '#f97316'] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * .3,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * 360,
    vr: -8 + Math.random() * 16,
  }));
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (elapsed < durationMs) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
