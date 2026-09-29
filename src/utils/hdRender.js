/* ═══════════════════════════════════════════════════════════════
   hdRender.js — High Definition Diagram Rendering & Export Engine
   Renders billiard diagram models to an offscreen canvas at any
   target resolution (1080p Full HD, 2K, 4K, 8K, custom scales).
═══════════════════════════════════════════════════════════════ */

function drawRoundedRect(ctx, x, y, w, h, r = 0) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function adjustColorBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string') return '#888888';
  let num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

/**
 * Render the complete billiard diagram onto a canvas of given width and height.
 */
export function renderDiagramToCanvas({
  canvas,
  width,
  height,
  clothColor = '#0d5c3a',
  showDiamonds = true,
  balls = {
    white: { x: 0.25, y: 0.75, label: '1' },
    yellow: { x: 0.25, y: 0.25, label: '2' },
    red: { x: 0.75, y: 0.5, label: '3' },
  },
  lines = [],
  points = [],
  texts = [],
  strikeMode = false,
  spin = { x: 0, y: 0 },
  strike = -0.5,
  showHeader = false,
  titleText = 'Billiard Sketcher — Diagrama 3 Bandas',
  subtitleText = '',
  showWatermark = true,
  watermarkText = 'Billiard Sketcher • 3-Bandas HD',
  showStrikeWidget = null, // null defaults to strikeMode state
}) {
  if (!canvas) return;

  const includeStrike = showStrikeWidget !== null ? showStrikeWidget : strikeMode;
  const bannerHeight = showHeader ? Math.max(48, Math.round(width * 0.05)) : 0;
  const totalHeight = height + bannerHeight;

  canvas.width = width;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.clearRect(0, 0, width, totalHeight);

  // 0. Render Top Banner (Header) if requested
  if (showHeader) {
    ctx.save();
    // Banner background
    const bgGrad = ctx.createLinearGradient(0, 0, width, 0);
    bgGrad.addColorStop(0, '#07090f');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#07090f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, bannerHeight);

    // Bottom accent line
    const borderGrad = ctx.createLinearGradient(0, bannerHeight - 2, width, bannerHeight - 2);
    borderGrad.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
    borderGrad.addColorStop(0.5, '#0ea5e9');
    borderGrad.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, bannerHeight - 3, width, 3);

    // Banner Text Left (Title)
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.round(bannerHeight * 0.38)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText || 'Billiard Sketcher — Diagrama 3 Bandas', width * 0.03, bannerHeight / 2);

    // Banner Text Right (Subtitle & Timestamp)
    const rightText = subtitleText || `Billiard Sketcher • ${new Date().toLocaleDateString()}`;
    ctx.fillStyle = '#38bdf8';
    ctx.font = `600 ${Math.round(bannerHeight * 0.32)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(rightText, width * 0.97, bannerHeight / 2);

    ctx.restore();
  }

  // Offset table drawing down by bannerHeight
  const tableTop = bannerHeight;
  const marginX = width * 0.045;
  const marginY = height * 0.09;
  const playWidth = width - marginX * 2;
  const playHeight = height - marginY * 2;
  const scale = playWidth / 819;

  const normToPx = (nx, ny) => ({
    x: marginX + nx * playWidth,
    y: tableTop + marginY + ny * playHeight,
  });

  const ballRadius = Math.max(6 * scale, playWidth * (30.75 / 2840));

  // 1. Outer wooden rail
  ctx.save();
  ctx.fillStyle = '#3b1c0a';
  ctx.fillRect(0, tableTop, width, height);

  // Top highlight & bottom shadow lines on wood
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, tableTop, width, Math.max(2, height * 0.008));
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, tableTop + height - Math.max(4, height * 0.012), width, Math.max(4, height * 0.012));

  // 2. Cloth
  ctx.fillStyle = clothColor;
  ctx.fillRect(marginX, tableTop + marginY, playWidth, playHeight);

  ctx.strokeStyle = '#052b1b';
  ctx.lineWidth = Math.max(2, playWidth * 0.005);
  ctx.setLineDash([]);
  ctx.strokeRect(marginX, tableTop + marginY, playWidth, playHeight);

  // Cushion bevels
  const bevelW = Math.max(4, playWidth * 0.005);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(marginX - bevelW, tableTop + marginY - bevelW, playWidth + bevelW * 2, bevelW);
  ctx.fillRect(marginX - bevelW, tableTop + marginY + playHeight, playWidth + bevelW * 2, bevelW);
  ctx.fillRect(marginX - bevelW, tableTop + marginY - bevelW, bevelW, playHeight + bevelW * 2);
  ctx.fillRect(marginX + playWidth, tableTop + marginY - bevelW, bevelW, playHeight + bevelW * 2);

  // 3. Diamond markers
  if (showDiamonds) {
    const dr = Math.max(3 * scale, playWidth * 0.004);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1, scale * 0.8);
    const drawDiamond = (cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - dr);
      ctx.lineTo(cx + dr * 0.75, cy);
      ctx.lineTo(cx, cy + dr);
      ctx.lineTo(cx - dr * 0.75, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    for (let i = 0; i <= 8; i++) {
      drawDiamond(marginX + (i / 8) * playWidth, tableTop + marginY / 2);
      drawDiamond(marginX + (i / 8) * playWidth, tableTop + height - marginY / 2);
    }
    for (let j = 0; j <= 4; j++) {
      drawDiamond(marginX / 2, tableTop + marginY + (j / 4) * playHeight);
      drawDiamond(width - marginX / 2, tableTop + marginY + (j / 4) * playHeight);
    }
  }

  // 4. Polygonal lines & arrows
  (lines || []).forEach((line) => {
    if (!line.points || line.points.length < 2) return;
    const lw = Math.max(1.5, (line.width || 2) * scale);

    const applyDash = () => {
      if (line.style === 'dashed') ctx.setLineDash([lw * 6, lw * 3]);
      else if (line.style === 'dotted') ctx.setLineDash([lw * 1.5, lw * 4]);
      else ctx.setLineDash([]);
    };

    applyDash();
    const p0 = normToPx(line.points[0].x, line.points[0].y);
    ctx.beginPath();
    ctx.strokeStyle = line.color || '#06b6d4';
    ctx.lineWidth = lw;
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < line.points.length; i++) {
      const pt = normToPx(line.points[i].x, line.points[i].y);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    if (line.isArrow && line.points.length >= 2) {
      const last = normToPx(line.points[line.points.length - 1].x, line.points[line.points.length - 1].y);
      const prev = normToPx(line.points[line.points.length - 2].x, line.points[line.points.length - 2].y);
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const al = Math.max(10 * scale, playWidth * 0.013) + lw;
      ctx.fillStyle = line.color || '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - al * Math.cos(angle - Math.PI / 6), last.y - al * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(last.x - al * Math.cos(angle + Math.PI / 6), last.y - al * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  });

  // 5. Points
  (points || []).forEach((ptNorm) => {
    const pt = normToPx(ptNorm.x, ptNorm.y);
    const baseR = ptNorm.radius || 8;
    const radius = Math.max(3, baseR * scale);
    const col = ptNorm.color || '#ef4444';

    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = Math.max(2, radius * 0.4);
    ctx.shadowOffsetX = Math.max(1, radius * 0.1);
    ctx.shadowOffsetY = Math.max(2, radius * 0.2);

    const grad = ctx.createRadialGradient(
      pt.x - radius * 0.3, pt.y - radius * 0.3, radius * 0.08,
      pt.x, pt.y, radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, col);
    grad.addColorStop(1, adjustColorBrightness(col, -40));

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(1, radius * 0.15);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.stroke();
    ctx.restore();
  });

  // 6. Text annotations
  (texts || []).forEach((t) => {
    const pt = normToPx(t.x, t.y);
    const fontSize = Math.max(12 * scale, Math.round(playWidth * 0.015));
    const col = t.color || '#f59e0b';

    ctx.save();
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.max(2, fontSize * 0.2);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.text, pt.x, pt.y);
    ctx.restore();
  });

  // 7. Balls
  const ballKeys = ['white', 'yellow', 'red'];
  ballKeys.forEach((key) => {
    const b = balls[key];
    if (!b) return;
    const pt = normToPx(b.x, b.y);
    const r = ballRadius;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      pt.x - r * 0.3, pt.y - r * 0.3, r * 0.1,
      pt.x, pt.y, r
    );
    if (key === 'white') {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
    } else if (key === 'yellow') {
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.7, '#facc15');
      grad.addColorStop(1, '#ca8a04');
    } else {
      grad.addColorStop(0, '#fca5a5');
      grad.addColorStop(0.6, '#dc2626');
      grad.addColorStop(1, '#7f1d1d');
    }
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.max(3, r * 0.4);
    ctx.shadowOffsetX = Math.max(2, r * 0.15);
    ctx.shadowOffsetY = Math.max(3, r * 0.25);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.strokeStyle = key === 'white' ? '#cbd5e1' : key === 'yellow' ? '#eab308' : '#991b1b';
    ctx.stroke();

    if (r >= 6) {
      ctx.fillStyle = key === 'white' ? '#0f172a' : key === 'yellow' ? '#0f172a' : '#ffffff';
      ctx.font = `700 ${Math.round(r * 0.95)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label || '', pt.x, pt.y);
    }
  });

  // 8. Strike & Spin Widget (Toma y Efecto)
  if (includeStrike) {
    const cardW = Math.min(260 * scale, playWidth * 0.34);
    const cardH = cardW * (128 / 260);
    const cardX = marginX + playWidth - cardW - 12 * scale;
    const cardY = tableTop + marginY + playHeight - cardH - 12 * scale;
    const rad = 12 * scale;

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, rad);
    ctx.fillStyle = clothColor;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.stroke();

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, rad);
    ctx.clip();

    const fullness = Math.max(0, 1 - Math.abs(strike));
    const fraction =
      fullness >= 0.94 ? '1/1' :
      fullness >= 0.80 ? '7/8' :
      fullness >= 0.68 ? '3/4' :
      fullness >= 0.56 ? '5/8' :
      fullness >= 0.44 ? '1/2' :
      fullness >= 0.31 ? '3/8' :
      fullness >= 0.19 ? '1/4' :
      fullness >= 0.07 ? '1/8' : '0';

    const headerH = 20 * scale;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.max(9, 9 * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('TOMA / EFECTO', cardX + 8 * scale, cardY + headerH / 2 + 1);

    const badgeText = fraction;
    ctx.font = `800 ${Math.max(10, 11 * scale)}px monospace`;
    const bw = ctx.measureText(badgeText).width + 12 * scale;
    const labelW = ctx.measureText('TOMA / EFECTO').width;
    const badgeX = cardX + 8 * scale + labelW + 8 * scale;
    const badgeY = cardY + 3 * scale;
    const badgeH = 15 * scale;
    drawRoundedRect(ctx, badgeX, badgeY, bw, badgeH, 5 * scale);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = `800 ${Math.max(10, 11 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, badgeX + bw / 2, badgeY + badgeH / 2 + 1);

    const stageTop = cardY + headerH;
    const stageH = cardH - headerH;
    const cx = cardX + cardW / 2;
    const cy = stageTop + stageH / 2;
    const ballR = Math.min(cardH * 0.24, cardW * 0.12);
    const shiftX = strike * (ballR * 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.moveTo(cx, stageTop + 12 * scale);
    ctx.lineTo(cx, stageTop + stageH - 12 * scale);
    ctx.stroke();

    const drawWidgetBall = (bx2, by2, grad0, grad1, grad2, borderCol, label, labelCol) => {
      ctx.globalAlpha = 0.6;
      const g = ctx.createRadialGradient(bx2 - ballR * 0.3, by2 - ballR * 0.3, ballR * 0.1, bx2, by2, ballR);
      g.addColorStop(0, grad0);
      g.addColorStop(0.58, grad1);
      g.addColorStop(1, grad2);
      ctx.beginPath();
      ctx.arc(bx2, by2, ballR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = Math.max(1, scale);
      ctx.strokeStyle = borderCol;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = labelCol;
      ctx.font = `700 ${Math.round(ballR * 0.55)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx2, by2);
    };

    drawWidgetBall(cx + shiftX, cy, '#fde68a', '#f5c518', '#c98a04', 'rgba(202,138,4,0.85)', '2', '#78350f');
    drawWidgetBall(cx, cy, '#ffffff', '#dfe6ee', '#9aa7b6', 'rgba(203,213,225,0.75)', '1', '#475569');

    const mkX = cx + spin.x * ballR * 0.8;
    const mkY = cy - spin.y * ballR * 0.8;
    ctx.beginPath();
    ctx.arc(mkX, mkY, Math.max(3 * scale, ballR * 0.16), 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // 9. Watermark at bottom right of cloth
  if (showWatermark) {
    ctx.save();
    ctx.font = `600 ${Math.max(11, Math.round(11 * scale))}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(watermarkText || 'Billiard Sketcher • 3-Bandas HD', marginX + playWidth - 8 * scale, tableTop + marginY + playHeight - 6 * scale);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Generate a Blob from an offscreen HD canvas.
 */
export async function generateHDDiagramBlob(diagramData, options = {}) {
  const {
    width = 1920,
    height = 960,
    format = 'image/png', // 'image/png', 'image/jpeg', 'image/webp'
    quality = 0.95,
  } = options;

  const canvas = document.createElement('canvas');
  renderDiagramToCanvas({
    canvas,
    width,
    height,
    clothColor: diagramData.table?.clothColor ?? '#0d5c3a',
    showDiamonds: diagramData.table?.showDiamonds ?? true,
    balls: diagramData.balls,
    lines: diagramData.lines,
    points: diagramData.points,
    texts: diagramData.texts,
    strikeMode: diagramData.strike?.strikeMode ?? false,
    spin: diagramData.strike?.spin ?? { x: 0, y: 0 },
    strike: diagramData.strike?.strike ?? -0.5,
    showHeader: options.showHeader ?? false,
    titleText: options.titleText ?? 'Billiard Sketcher — Diagrama 3 Bandas',
    subtitleText: options.subtitleText ?? '',
    showWatermark: options.showWatermark ?? true,
    watermarkText: options.watermarkText ?? 'Billiard Sketcher • 3-Bandas HD',
    showStrikeWidget: options.showStrikeWidget ?? null,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, quality);
  });
}

/**
 * Helper to download an HD diagram image.
 */
export async function downloadHDDiagram(diagramData, options = {}) {
  const blob = await generateHDDiagramBlob(diagramData, options);
  if (!blob) return false;

  const ext = options.format === 'image/jpeg' ? 'jpg' : options.format === 'image/webp' ? 'webp' : 'png';
  const label = options.resolutionLabel ? `-${options.resolutionLabel}` : `-${options.width || 1920}p`;
  const filename = `billiard-diagram${label}-${Date.now()}.${ext}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/**
 * Helper to copy an HD diagram image directly to system Clipboard.
 */
export async function copyHDDiagramToClipboard(diagramData, options = {}) {
  try {
    // Clipboard API usually requires PNG format
    const pngBlob = await generateHDDiagramBlob(diagramData, { ...options, format: 'image/png' });
    if (!pngBlob) return false;

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new window.ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard copy error:', err);
  }
  return false;
}
