import html2canvas from 'html2canvas';

/**
 * Efecto de desintegración en partículas (estilo Telegram / "Thanos" / Google Wallet):
 * captura el elemento como imagen, lo parte en mosaicos y los dispersa con un
 * barrido de izquierda a derecha mientras se desvanecen.
 *
 * Oculta el elemento original y resuelve cuando termina la animación, para que
 * el llamador borre el dato (mutación) justo después.
 */
export async function disintegrate(el: HTMLElement): Promise<void> {
  // Respeta la preferencia de menos movimiento.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    el.style.transition = 'opacity 0.2s ease';
    el.style.opacity = '0';
    await wait(220);
    return;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      logging: false,
      useCORS: true,
    });
  } catch {
    // Si la captura falla, degradamos a un fade simple.
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    await wait(260);
    return;
  }

  const layer = document.createElement('div');
  layer.style.cssText =
    `position:fixed;left:${rect.left}px;top:${rect.top}px;` +
    `width:${rect.width}px;height:${rect.height}px;` +
    `pointer-events:none;z-index:3000;overflow:visible;`;
  document.body.appendChild(layer);

  // Oculta el original; las partículas lo reemplazan visualmente.
  el.style.visibility = 'hidden';

  const cols = clamp(Math.round(rect.width / 14), 6, 36);
  const rows = clamp(Math.round(rect.height / 14), 3, 18);
  const tileW = rect.width / cols;
  const tileH = rect.height / rows;
  const sx = canvas.width / cols;
  const sy = canvas.height / rows;

  const anims: Animation[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('canvas');
      tile.width = Math.max(1, Math.round(sx));
      tile.height = Math.max(1, Math.round(sy));
      const ctx = tile.getContext('2d');
      if (ctx) ctx.drawImage(canvas, c * sx, r * sy, sx, sy, 0, 0, tile.width, tile.height);

      tile.style.cssText =
        `position:absolute;left:${c * tileW}px;top:${r * tileH}px;` +
        `width:${tileW + 0.5}px;height:${tileH + 0.5}px;will-change:transform,opacity;`;
      layer.appendChild(tile);

      // Barrido izquierda→derecha (como Telegram): el retardo crece con la columna.
      const delay = (c / cols) * 220 + Math.random() * 90;
      const dx = (Math.random() - 0.25) * 46;
      const dy = -18 - Math.random() * 55;
      const rot = (Math.random() - 0.5) * 80;

      const anim = tile.animate(
        [
          { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy}px) scale(0.15) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        { duration: 620 + Math.random() * 280, delay, easing: 'cubic-bezier(.2,.55,.3,1)', fill: 'forwards' },
      );
      anims.push(anim);
    }
  }

  await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
  layer.remove();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
