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

/**
 * Returns the band/rail color that matches the chosen cloth color.
 * Green  → wood brown (default)
 * Blue   → grey
 * Grey   → black
 * Black  → near-black
 */
function getRailColor(clothColor) {
  switch (clothColor) {
    case '#1e3a8a': return '#4b5563'; // blue cloth  → grey rail
    case '#334155': return '#111827'; // grey cloth  → black rail
    case '#111827': return '#0a0a0a'; // black cloth → near-black rail
    default:        return '#3b1c0a'; // green (and anything else) → wood brown
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
  showDetailedPoints = false,
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

    // Banner Text Right (Subtitle)
    if (subtitleText) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = `600 ${Math.round(bannerHeight * 0.32)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(subtitleText, width * 0.97, bannerHeight / 2);
    }

    ctx.restore();
  }

  // Offset table drawing down by bannerHeight
  const tableTop = bannerHeight;
  // Real 3-cushion table dimensions (2.84m x 1.42m playfield, 3.19m x 1.77m total exterior)
  // Total border = 175mm (50mm rubber cushion + 125mm wooden frame)
  const marginX = width * (175 / 3190);
  const marginY = height * (175 / 1770);
  const playWidth = width - marginX * 2;
  const playHeight = height - marginY * 2;
  const scale = playWidth / 801;

  const cushionW = marginX * (50 / 175);
  const cushionH = marginY * (50 / 175);
  const railCenterX = marginX * (62.5 / 175);
  const railCenterY = marginY * (62.5 / 175);

  const normToPx = (nx, ny) => ({
    x: marginX + nx * playWidth,
    y: tableTop + marginY + ny * playHeight,
  });

  const ballRadius = Math.max(6 * scale, playWidth * (30.75 / 2840));

  // 1. Outer wooden rail
  ctx.save();
  ctx.fillStyle = getRailColor(clothColor);
  ctx.fillRect(0, tableTop, width, height);

  // Top highlight & bottom shadow lines on wood
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, tableTop, width, Math.max(2, height * 0.008));
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, tableTop + height - Math.max(4, height * 0.012), width, Math.max(4, height * 0.012));

  // 2. Rubber cushion band (wrapped in cloth, with natural bevel depth shading)
  ctx.fillStyle = clothColor;
  ctx.fillRect(marginX - cushionW, tableTop + marginY - cushionH, playWidth + cushionW * 2, playHeight + cushionH * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(marginX - cushionW, tableTop + marginY - cushionH, playWidth + cushionW * 2, playHeight + cushionH * 2);

  // 3. Flat playing surface (pizarra / paño de juego)
  ctx.fillStyle = clothColor;
  ctx.fillRect(marginX, tableTop + marginY, playWidth, playHeight);

  // Cushion nose bevel (arista de rebote)
  ctx.strokeStyle = 'rgba(0,0,0,0.50)';
  ctx.lineWidth = Math.max(1.5, playWidth * 0.0025);
  ctx.setLineDash([]);
  ctx.strokeRect(marginX, tableTop + marginY, playWidth, playHeight);

  // Corner mitre lines (corte a 45° en las esquinas de las bandas)
  ctx.strokeStyle = 'rgba(0,0,0,0.38)';
  ctx.lineWidth = Math.max(1, playWidth * 0.0018);
  ctx.beginPath();
  ctx.moveTo(marginX - cushionW, tableTop + marginY - cushionH);
  ctx.lineTo(marginX, tableTop + marginY);
  ctx.moveTo(marginX + playWidth + cushionW, tableTop + marginY - cushionH);
  ctx.lineTo(marginX + playWidth, tableTop + marginY);
  ctx.moveTo(marginX - cushionW, tableTop + marginY + playHeight + cushionH);
  ctx.lineTo(marginX, tableTop + marginY + playHeight);
  ctx.moveTo(marginX + playWidth + cushionW, tableTop + marginY + playHeight + cushionH);
  ctx.lineTo(marginX + playWidth, tableTop + marginY + playHeight);
  ctx.stroke();

  // 3. Diamond markers & Detailed points (centered in 125mm wooden rail)
  if (showDetailedPoints) {
    const dr = Math.max(3 * scale, playWidth * 0.004);
    const rMajor = Math.max(3.6 * scale, dr * 0.95);
    const rHalf  = Math.max(2.2 * scale, dr * 0.58);
    const rTenth = Math.max(1.3 * scale, dr * 0.35);

    const drawDot = (cx, cy, r, lw) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    // Long rails: 80 subdivisions (8 diamonds * 10)
    for (let k = 0; k <= 80; k++) {
      const x = marginX + (k / 80) * playWidth;
      const isMajor = k % 10 === 0;
      const isHalf  = k % 5 === 0;
      const r  = isMajor ? rMajor : isHalf ? rHalf : rTenth;
      const lw = isMajor ? Math.max(1, scale * 0.8) : isHalf ? Math.max(0.8, scale * 0.7) : Math.max(0.6, scale * 0.5);
      drawDot(x, tableTop + railCenterY, r, lw);
      drawDot(x, tableTop + height - railCenterY, r, lw);
    }

    // Short rails: 40 subdivisions (4 diamonds * 10)
    for (let k = 0; k <= 40; k++) {
      const y = tableTop + marginY + (k / 40) * playHeight;
      const isMajor = k % 10 === 0;
      const isHalf  = k % 5 === 0;
      const r  = isMajor ? rMajor : isHalf ? rHalf : rTenth;
      const lw = isMajor ? Math.max(1, scale * 0.8) : isHalf ? Math.max(0.8, scale * 0.7) : Math.max(0.6, scale * 0.5);
      drawDot(railCenterX, y, r, lw);
      drawDot(width - railCenterX, y, r, lw);
    }
  } else if (showDiamonds) {
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
      drawDiamond(marginX + (i / 8) * playWidth, tableTop + railCenterY);
      drawDiamond(marginX + (i / 8) * playWidth, tableTop + height - railCenterY);
    }
    for (let j = 0; j <= 4; j++) {
      drawDiamond(railCenterX, tableTop + marginY + (j / 4) * playHeight);
      drawDiamond(width - railCenterX, tableTop + marginY + (j / 4) * playHeight);
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
  const TEXT_SIZE_SCALES_HD = { xs: 0.55, s: 0.75, m: 1.0, l: 1.4, xl: 1.9 };
  (texts || []).forEach((t) => {
    const pt = normToPx(t.x, t.y);
    const sizeScale = TEXT_SIZE_SCALES_HD[t.size ?? 'm'] ?? 1.0;
    const fontSize = Math.max(12 * scale, Math.round(playWidth * 0.015 * sizeScale));
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
    height = 1066,
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
    showDetailedPoints: options.showDetailedPoints ?? diagramData.table?.showDetailedPoints ?? false,
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

/* ═══════════════════════════════════════════════════════════════
   SVG Export — vector rendering matching the HD canvas output
═══════════════════════════════════════════════════════════════ */

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 136, g: 136, b: 136 };
  const n = parseInt(hex.replace('#', ''), 16);
  if (isNaN(n)) return { r: 136, g: 136, b: 136 };
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function adjustHexBrightness(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v + pct)));
  return `#${clamp(r).toString(16).padStart(2,'0')}${clamp(g).toString(16).padStart(2,'0')}${clamp(b).toString(16).padStart(2,'0')}`;
}

/**
 * Generate a complete SVG string for the billiard diagram.
 * Uses the same coordinate math as renderDiagramToCanvas so the
 * visual output is identical, but the result is infinitely scalable.
 *
 * @param {object} diagramData   Same shape consumed by renderDiagramToCanvas
 * @param {object} options       Same options accepted by generateHDDiagramBlob
 * @returns {string}             UTF-8 SVG markup
 */
export function generateDiagramSVG(diagramData, options = {}) {
  const {
    width  = 1920,
    height = 1066,
    showHeader    = false,
    titleText     = 'Billiard Sketcher — Diagrama 3 Bandas',
    subtitleText  = '',
    showWatermark = true,
    watermarkText = 'Billiard Sketcher • 3-Bandas HD',
    showStrikeWidget = null,
  } = options;

  const clothColor  = diagramData.table?.clothColor  ?? '#0d5c3a';
  const showDiamonds = diagramData.table?.showDiamonds ?? true;
  const showDetailedPoints = options.showDetailedPoints ?? diagramData.table?.showDetailedPoints ?? false;
  const balls       = diagramData.balls  ?? {};
  const lines       = diagramData.lines  ?? [];
  const points      = diagramData.points ?? [];
  const texts       = diagramData.texts  ?? [];
  const spin        = diagramData.strike?.spin      ?? { x: 0, y: 0 };
  const strike      = diagramData.strike?.strike    ?? -0.5;
  const strikeMode  = diagramData.strike?.strikeMode ?? false;
  const includeStrike = showStrikeWidget !== null ? showStrikeWidget : strikeMode;

  const bannerHeight = showHeader ? Math.max(48, Math.round(width * 0.05)) : 0;
  const totalHeight  = height + bannerHeight;

  // Real 3-cushion table dimensions (2.84m x 1.42m playfield, 3.19m x 1.77m total exterior)
  // Total border = 175mm (50mm rubber cushion + 125mm wooden frame)
  const marginX    = width  * (175 / 3190);
  const marginY    = height * (175 / 1770);
  const playWidth  = width  - marginX * 2;
  const playHeight = height - marginY * 2;
  const scale      = playWidth / 801;
  const tableTop   = bannerHeight;
  const cushionW   = marginX * (50 / 175);
  const cushionH   = marginY * (50 / 175);
  const railCenterX = marginX * (62.5 / 175);
  const railCenterY = marginY * (62.5 / 175);

  const normToPx = (nx, ny) => ({
    x: marginX + nx * playWidth,
    y: tableTop + marginY + ny * playHeight,
  });

  const ballRadius = Math.max(6 * scale, playWidth * (30.75 / 2840));

  // ── Unique IDs for gradients / defs ─────────────────────────────
  const uid = `bsk${Math.random().toString(36).slice(2, 8)}`;
  let defs = '';
  let body = '';

  // ── 0. Background rect ──────────────────────────────────────────
  body += `<rect width="${width}" height="${totalHeight}" fill="#07090f"/>`;

  // ── 1. Banner ───────────────────────────────────────────────────
  if (showHeader) {
    defs += `
      <linearGradient id="${uid}_banner" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0"   stop-color="#07090f"/>
        <stop offset="0.5" stop-color="#0f172a"/>
        <stop offset="1"   stop-color="#07090f"/>
      </linearGradient>
      <linearGradient id="${uid}_bannerLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0"   stop-color="rgba(14,165,233,0.2)"/>
        <stop offset="0.5" stop-color="#0ea5e9"/>
        <stop offset="1"   stop-color="rgba(16,185,129,0.2)"/>
      </linearGradient>`;

    body += `<rect width="${width}" height="${bannerHeight}" fill="url(#${uid}_banner)"/>`;
    body += `<rect y="${bannerHeight - 3}" width="${width}" height="3" fill="url(#${uid}_bannerLine)"/>`;

    const fs1 = Math.round(bannerHeight * 0.38);
    const fs2 = Math.round(bannerHeight * 0.32);
    body += `<text x="${width * 0.03}" y="${bannerHeight / 2}" dominant-baseline="middle" text-anchor="start"
      font-family="Inter,system-ui,sans-serif" font-size="${fs1}" font-weight="700" fill="#f8fafc"
    >${esc(titleText)}</text>`;

    if (subtitleText) {
      body += `<text x="${width * 0.97}" y="${bannerHeight / 2}" dominant-baseline="middle" text-anchor="end"
        font-family="Inter,system-ui,sans-serif" font-size="${fs2}" font-weight="600" fill="#38bdf8"
      >${esc(subtitleText)}</text>`;
    }
  }

  // ── 2. Wooden rail ──────────────────────────────────────────────
  body += `<rect x="0" y="${tableTop}" width="${width}" height="${height}" fill="${getRailColor(clothColor)}"/>`;
  body += `<rect x="0" y="${tableTop}" width="${width}" height="${Math.max(2, height * 0.008)}" fill="rgba(255,255,255,0.08)"/>`;
  body += `<rect x="0" y="${tableTop + height - Math.max(4, height * 0.012)}" width="${width}" height="${Math.max(4, height * 0.012)}" fill="rgba(0,0,0,0.4)"/>`;

  // ── 3. Rubber cushion band (wrapped in cloth, with depth shading) ──
  body += `<rect x="${(marginX - cushionW).toFixed(1)}" y="${(tableTop + marginY - cushionH).toFixed(1)}" width="${(playWidth + cushionW * 2).toFixed(1)}" height="${(playHeight + cushionH * 2).toFixed(1)}" fill="${esc(clothColor)}"/>`;
  body += `<rect x="${(marginX - cushionW).toFixed(1)}" y="${(tableTop + marginY - cushionH).toFixed(1)}" width="${(playWidth + cushionW * 2).toFixed(1)}" height="${(playHeight + cushionH * 2).toFixed(1)}" fill="rgba(0,0,0,0.22)"/>`;

  // Flat playing surface (pizarra / paño de juego)
  body += `<rect x="${marginX.toFixed(1)}" y="${(tableTop + marginY).toFixed(1)}" width="${playWidth.toFixed(1)}" height="${playHeight.toFixed(1)}" fill="${esc(clothColor)}"/>`;

  // Cushion nose bevel (arista de rebote)
  body += `<rect x="${marginX.toFixed(1)}" y="${(tableTop + marginY).toFixed(1)}" width="${playWidth.toFixed(1)}" height="${playHeight.toFixed(1)}" fill="none" stroke="rgba(0,0,0,0.50)" stroke-width="${Math.max(1.5, playWidth * 0.0025).toFixed(1)}"/>`;

  // Corner mitres (corte a 45° en las esquinas de las bandas)
  const mitreW = Math.max(1, playWidth * 0.0018).toFixed(1);
  body += `<line x1="${(marginX - cushionW).toFixed(1)}" y1="${(tableTop + marginY - cushionH).toFixed(1)}" x2="${marginX.toFixed(1)}" y2="${(tableTop + marginY).toFixed(1)}" stroke="rgba(0,0,0,0.38)" stroke-width="${mitreW}"/>`;
  body += `<line x1="${(marginX + playWidth + cushionW).toFixed(1)}" y1="${(tableTop + marginY - cushionH).toFixed(1)}" x2="${(marginX + playWidth).toFixed(1)}" y2="${(tableTop + marginY).toFixed(1)}" stroke="rgba(0,0,0,0.38)" stroke-width="${mitreW}"/>`;
  body += `<line x1="${(marginX - cushionW).toFixed(1)}" y1="${(tableTop + marginY + playHeight + cushionH).toFixed(1)}" x2="${marginX.toFixed(1)}" y2="${(tableTop + marginY + playHeight).toFixed(1)}" stroke="rgba(0,0,0,0.38)" stroke-width="${mitreW}"/>`;
  body += `<line x1="${(marginX + playWidth + cushionW).toFixed(1)}" y1="${(tableTop + marginY + playHeight + cushionH).toFixed(1)}" x2="${(marginX + playWidth).toFixed(1)}" y2="${(tableTop + marginY + playHeight).toFixed(1)}" stroke="rgba(0,0,0,0.38)" stroke-width="${mitreW}"/>`;

  // ── 4. Diamonds & Detailed points (centered in 125mm wooden rail) ──
  if (showDetailedPoints) {
    const rMajor = Math.max(3.6 * scale, playWidth * 0.0038);
    const rHalf  = Math.max(2.2 * scale, playWidth * 0.0023);
    const rTenth = Math.max(1.3 * scale, playWidth * 0.0014);

    const dotSvg = (cx, cy, r, lw) =>
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#f8fafc" stroke="#1e293b" stroke-width="${lw.toFixed(1)}"/>`;

    for (let k = 0; k <= 80; k++) {
      const x = marginX + (k / 80) * playWidth;
      const isMajor = k % 10 === 0;
      const isHalf  = k % 5 === 0;
      const r  = isMajor ? rMajor : isHalf ? rHalf : rTenth;
      const lw = isMajor ? Math.max(1, scale * 0.8) : isHalf ? Math.max(0.8, scale * 0.7) : Math.max(0.6, scale * 0.5);
      body += dotSvg(x, tableTop + railCenterY, r, lw);
      body += dotSvg(x, tableTop + height - railCenterY, r, lw);
    }
    for (let k = 0; k <= 40; k++) {
      const y = tableTop + marginY + (k / 40) * playHeight;
      const isMajor = k % 10 === 0;
      const isHalf  = k % 5 === 0;
      const r  = isMajor ? rMajor : isHalf ? rHalf : rTenth;
      const lw = isMajor ? Math.max(1, scale * 0.8) : isHalf ? Math.max(0.8, scale * 0.7) : Math.max(0.6, scale * 0.5);
      body += dotSvg(railCenterX, y, r, lw);
      body += dotSvg(width - railCenterX, y, r, lw);
    }
  } else if (showDiamonds) {
    const dr = Math.max(3 * scale, playWidth * 0.004);
    const diamond = (cx, cy) =>
      `<polygon points="${cx},${cy - dr} ${cx + dr * 0.75},${cy} ${cx},${cy + dr} ${cx - dr * 0.75},${cy}"
        fill="#f8fafc" stroke="#1e293b" stroke-width="${Math.max(1, scale * 0.8)}"/>`;

    for (let i = 0; i <= 8; i++) {
      body += diamond(marginX + (i / 8) * playWidth, tableTop + railCenterY);
      body += diamond(marginX + (i / 8) * playWidth, tableTop + height - railCenterY);
    }
    for (let j = 0; j <= 4; j++) {
      body += diamond(railCenterX, tableTop + marginY + (j / 4) * playHeight);
      body += diamond(width - railCenterX, tableTop + marginY + (j / 4) * playHeight);
    }
  }

  // ── 5. Lines & arrows ────────────────────────────────────────────
  lines.forEach((line, li) => {
    if (!line.points || line.points.length < 2) return;
    const lw    = Math.max(1.5, (line.width || 2) * scale);
    const color = line.color || '#06b6d4';
    let dashAttr = '';
    if (line.style === 'dashed') dashAttr = `stroke-dasharray="${lw * 6} ${lw * 3}"`;
    else if (line.style === 'dotted') dashAttr = `stroke-dasharray="${lw * 1.5} ${lw * 4}"`;

    const pts = line.points.map(p => {
      const { x, y } = normToPx(p.x, p.y);
      return `${x},${y}`;
    }).join(' ');

    body += `<polyline points="${pts}" fill="none" stroke="${esc(color)}"
      stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr}/>`;

    // Arrow head
    if (line.isArrow && line.points.length >= 2) {
      const last = normToPx(line.points[line.points.length - 1].x, line.points[line.points.length - 1].y);
      const prev = normToPx(line.points[line.points.length - 2].x, line.points[line.points.length - 2].y);
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const al = Math.max(10 * scale, playWidth * 0.013) + lw;
      const ax1 = last.x - al * Math.cos(angle - Math.PI / 6);
      const ay1 = last.y - al * Math.sin(angle - Math.PI / 6);
      const ax2 = last.x - al * Math.cos(angle + Math.PI / 6);
      const ay2 = last.y - al * Math.sin(angle + Math.PI / 6);
      body += `<polygon points="${last.x},${last.y} ${ax1},${ay1} ${ax2},${ay2}" fill="${esc(color)}"/>`;
    }
  });

  // ── 6. Points ────────────────────────────────────────────────────
  points.forEach((ptNorm, pi) => {
    const pt    = normToPx(ptNorm.x, ptNorm.y);
    const baseR = ptNorm.radius || 8;
    const r     = Math.max(3, baseR * scale);
    const col   = ptNorm.color || '#ef4444';
    const dark  = adjustHexBrightness(col, -40);
    const gradId = `${uid}_pt${pi}`;

    defs += `
      <radialGradient id="${gradId}" cx="${pt.x - r * 0.3}" cy="${pt.y - r * 0.3}" r="${r}"
        fx="${pt.x - r * 0.3}" fy="${pt.y - r * 0.3}" gradientUnits="userSpaceOnUse">
        <stop offset="0"    stop-color="#ffffff"/>
        <stop offset="0.35" stop-color="${esc(col)}"/>
        <stop offset="1"    stop-color="${esc(dark)}"/>
      </radialGradient>`;

    body += `<circle cx="${pt.x}" cy="${pt.y}" r="${r}"
      fill="url(#${gradId})"
      stroke="rgba(255,255,255,0.75)" stroke-width="${Math.max(1, r * 0.15)}"
      filter="drop-shadow(${Math.max(1, r * 0.1)}px ${Math.max(2, r * 0.2)}px ${Math.max(2, r * 0.4)}px rgba(0,0,0,0.5))"/>`;
  });

  // ── 7. Texts ─────────────────────────────────────────────────────
  const TEXT_SIZE_SCALES_SVG = { xs: 0.55, s: 0.75, m: 1.0, l: 1.4, xl: 1.9 };
  texts.forEach((t) => {
    const pt      = normToPx(t.x, t.y);
    const sizeScale = TEXT_SIZE_SCALES_SVG[t.size ?? 'm'] ?? 1.0;
    const fontSize = Math.max(12 * scale, Math.round(playWidth * 0.015 * sizeScale));
    const col     = t.color || '#f59e0b';
    body += `<text x="${pt.x}" y="${pt.y}" dominant-baseline="middle" text-anchor="middle"
      font-family="Inter,system-ui,sans-serif" font-size="${fontSize}" font-weight="700"
      fill="${esc(col)}"
      filter="drop-shadow(1px 1px ${Math.max(2, fontSize * 0.2)}px rgba(0,0,0,0.85))"
    >${esc(t.text)}</text>`;
  });

  // ── 8. Balls ─────────────────────────────────────────────────────
  const ballConfigs = {
    white:  { stops: [['0','#ffffff'],['0.7','#e2e8f0'],['1','#94a3b8']], stroke: '#cbd5e1', label: '#0f172a' },
    yellow: { stops: [['0','#fef08a'],['0.7','#facc15'],['1','#ca8a04']], stroke: '#eab308', label: '#0f172a' },
    red:    { stops: [['0','#fca5a5'],['0.6','#dc2626'],['1','#7f1d1d']], stroke: '#991b1b', label: '#ffffff' },
  };

  Object.entries(ballConfigs).forEach(([key, cfg]) => {
    const b = balls[key];
    if (!b) return;
    const pt  = normToPx(b.x, b.y);
    const r   = ballRadius;
    const gid = `${uid}_ball_${key}`;

    defs += `
      <radialGradient id="${gid}" cx="${pt.x - r * 0.3}" cy="${pt.y - r * 0.3}" r="${r}"
        fx="${pt.x - r * 0.3}" fy="${pt.y - r * 0.3}" gradientUnits="userSpaceOnUse">
        ${cfg.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}
      </radialGradient>`;

    body += `<circle cx="${pt.x}" cy="${pt.y}" r="${r}"
      fill="url(#${gid})"
      stroke="${cfg.stroke}" stroke-width="${Math.max(1, r * 0.08)}"
      filter="drop-shadow(${Math.max(2, r * 0.15)}px ${Math.max(3, r * 0.25)}px ${Math.max(3, r * 0.4)}px rgba(0,0,0,0.5))"/>`;

    if (r >= 6) {
      body += `<text x="${pt.x}" y="${pt.y}" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter,system-ui,sans-serif" font-size="${Math.round(r * 0.95)}" font-weight="700"
        fill="${cfg.label}">${esc(b.label || '')}</text>`;
    }
  });

  // ── 9. Strike & Spin Widget ───────────────────────────────────────
  if (includeStrike) {
    const cardW = Math.min(260 * scale, playWidth * 0.34);
    const cardH = cardW * (128 / 260);
    const cardX = marginX + playWidth - cardW - 12 * scale;
    const cardY = tableTop + marginY + playHeight - cardH - 12 * scale;
    const rad   = 12 * scale;

    // Card background
    body += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${rad}" ry="${rad}"
      fill="${esc(clothColor)}" stroke="rgba(0,0,0,0.45)" stroke-width="${Math.max(1.5, 2 * scale)}"/>`;

    const headerH  = 20 * scale;
    const stageTop = cardY + headerH;
    const stageH   = cardH - headerH;
    const cx       = cardX + cardW / 2;
    const cy2      = stageTop + stageH / 2;
    const ballR    = Math.min(cardH * 0.24, cardW * 0.12);
    const shiftX   = strike * (ballR * 2);

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

    const hfs = Math.max(9, 9 * scale);
    body += `<text x="${cardX + 8 * scale}" y="${cardY + headerH / 2 + 1}" dominant-baseline="middle"
      font-family="Inter,system-ui,sans-serif" font-size="${hfs}" font-weight="700"
      fill="rgba(255,255,255,0.85)">TOMA / EFECTO</text>`;

    // badge
    const bfs = Math.max(10, 11 * scale);
    const bw  = fraction.length * bfs * 0.65 + 12 * scale;
    const badgeX = cardX + 8 * scale + fraction.length * 0 + hfs * 8.5 + 8 * scale; // approx label width
    body += `<rect x="${badgeX}" y="${cardY + 3 * scale}" width="${bw}" height="${15 * scale}" rx="${5 * scale}" ry="${5 * scale}" fill="rgba(0,0,0,0.4)"/>`;
    body += `<text x="${badgeX + bw / 2}" y="${cardY + 3 * scale + 15 * scale / 2 + 1}" dominant-baseline="middle" text-anchor="middle"
      font-family="monospace" font-size="${bfs}" font-weight="800" fill="#fde68a">${esc(fraction)}</text>`;

    // Centre divider
    body += `<line x1="${cx}" y1="${stageTop + 12 * scale}" x2="${cx}" y2="${stageTop + stageH - 12 * scale}"
      stroke="rgba(255,255,255,0.14)" stroke-width="${Math.max(1, scale)}"/>`;

    // Yellow ball (shifted by strike)
    const ybx = cx + shiftX;
    const yby = cy2;
    const ygid = `${uid}_sw_yellow`;
    defs += `
      <radialGradient id="${ygid}" cx="${ybx - ballR*0.3}" cy="${yby - ballR*0.3}" r="${ballR}"
        fx="${ybx - ballR*0.3}" fy="${yby - ballR*0.3}" gradientUnits="userSpaceOnUse">
        <stop offset="0"    stop-color="#fde68a"/>
        <stop offset="0.58" stop-color="#f5c518"/>
        <stop offset="1"    stop-color="#c98a04"/>
      </radialGradient>`;
    body += `<circle cx="${ybx}" cy="${yby}" r="${ballR}"
      fill="url(#${ygid})" fill-opacity="0.6"
      stroke="rgba(202,138,4,0.85)" stroke-width="${Math.max(1, scale)}"/>`;
    body += `<text x="${ybx}" y="${yby}" dominant-baseline="middle" text-anchor="middle"
      font-family="Inter,sans-serif" font-size="${Math.round(ballR * 0.55)}" font-weight="700"
      fill="#78350f">2</text>`;

    // White ball
    const wgid = `${uid}_sw_white`;
    defs += `
      <radialGradient id="${wgid}" cx="${cx - ballR*0.3}" cy="${cy2 - ballR*0.3}" r="${ballR}"
        fx="${cx - ballR*0.3}" fy="${cy2 - ballR*0.3}" gradientUnits="userSpaceOnUse">
        <stop offset="0"    stop-color="#ffffff"/>
        <stop offset="0.58" stop-color="#dfe6ee"/>
        <stop offset="1"    stop-color="#9aa7b6"/>
      </radialGradient>`;
    body += `<circle cx="${cx}" cy="${cy2}" r="${ballR}"
      fill="url(#${wgid})" fill-opacity="0.6"
      stroke="rgba(203,213,225,0.75)" stroke-width="${Math.max(1, scale)}"/>`;
    body += `<text x="${cx}" y="${cy2}" dominant-baseline="middle" text-anchor="middle"
      font-family="Inter,sans-serif" font-size="${Math.round(ballR * 0.55)}" font-weight="700"
      fill="#475569">1</text>`;

    // Spin marker
    const mkX = cx + spin.x * ballR * 0.8;
    const mkY = cy2 - spin.y * ballR * 0.8;
    const mkR = Math.max(3 * scale, ballR * 0.16);
    body += `<circle cx="${mkX}" cy="${mkY}" r="${mkR}"
      fill="#dc2626" stroke="#ffffff" stroke-width="${Math.max(1.5, 2 * scale)}"/>`;
  }

  // ── 10. Watermark ────────────────────────────────────────────────
  if (showWatermark) {
    const wfs = Math.max(11, Math.round(11 * scale));
    body += `<text x="${marginX + playWidth - 8 * scale}" y="${tableTop + marginY + playHeight - 6 * scale}"
      text-anchor="end" dominant-baseline="auto"
      font-family="Inter,system-ui,sans-serif" font-size="${wfs}" font-weight="600"
      fill="rgba(255,255,255,0.45)">${esc(watermarkText)}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${totalHeight}"
  width="${width}" height="${totalHeight}">
  <defs>${defs}</defs>
  ${body}
</svg>`;
}

/**
 * Trigger a browser download of the SVG diagram.
 */
export function downloadSVGDiagram(diagramData, options = {}) {
  const svgStr  = generateDiagramSVG(diagramData, options);
  const blob    = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const label   = options.resolutionLabel ? `-${options.resolutionLabel}` : `-${options.width || 1920}p`;
  const link    = document.createElement('a');
  link.href     = url;
  link.download = `billiard-diagram${label}-${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
