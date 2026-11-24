import React, { useRef, useEffect, useState, useCallback } from 'react';
import { renderDiagramToCanvas } from '../utils/hdRender';
import StrikePanel from './StrikePanel';

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

function getRailColor(clothColor) {
  switch (clothColor) {
    case '#1e3a8a': return '#4b5563'; // blue  → grey
    case '#334155': return '#111827'; // grey  → black
    case '#111827': return '#0a0a0a'; // black → near-black
    default:        return '#3b1c0a'; // green → wood brown
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

export default function TableCanvas({
  activeTool,
  clothColor = '#0d5c3a',
  setClothColor = () => {},
  showDiamonds = true,
  setShowDiamonds = () => {},
  showDetailedPoints = false,
  setShowDetailedPoints = () => {},
  showReferenceSpots = false,
  setShowReferenceSpots = () => {},
  showAlignmentGuides = true,
  setShowAlignmentGuides = () => {},
  strikeMode = false,
  setStrikeMode = () => {},
  spin = { x: 0, y: 0 },
  setSpin = () => {},
  strike = -0.5,
  setStrike = () => {},
  points = [],
  setPoints = () => { },
  pointRadius = 8,
  pointColor = '#ef4444',
  selectedPointId = null,
  setSelectedPointId = () => { },
  texts: externalTexts,
  setTexts: setExternalTexts,
  textColor = '#f59e0b',
  setTextColor = () => { },
  textSize = 'm',
  setTextSize = () => { },
  selectedTextId = null,
  setSelectedTextId = () => { },
  onRegisterExportHandler,
  onRegisterCaptureHandler,
  onRegisterJsonHandler,
  onLineStateChange
}) {
  const canvasRef = useRef(null);
  const captureModeRef = useRef(false); // true only while baking a capture
  const [activeGuides, setActiveGuides] = useState([]);

  // ── Table Objects ────────────────────────────────────────────
  // Official UMB initial break positions (284 cm × 142 cm table):
  // - White (cue): head string (0.25), side spot 18.5 cm from head spot
  // - Yellow (opponent): head spot (0.25, 0.5)
  // - Red: foot spot (0.75, 0.5)
  const [balls, setBalls] = useState({
    white:  { x: 0.25, y: 0.5 + 18.5 / 142, label: '1' },
    yellow: { x: 0.25, y: 0.5,              label: '2' },
    red:    { x: 0.75, y: 0.5,              label: '3' },
  });

  const [lines, setLines] = useState([
    {
      id: 'default-line-1',
      points: [
        { x: 0.25,  y: 0.5 + 18.5 / 142 },
        { x: 0.75,  y: 0.5 },
        { x: 0.945, y: 0 },
        { x: 1,     y: 0.125 },
        { x: 0.5,   y: 1 },
        { x: 0.25,  y: 0.5 },
      ],
      color: '#06b6d4',
      style: 'solid',
      width: 2,
      isArrow: true,
    },
  ]);

  const [internalTexts, setInternalTexts] = useState([]);
  const texts = externalTexts !== undefined ? externalTexts : internalTexts;
  const setTexts = setExternalTexts !== undefined ? setExternalTexts : setInternalTexts;

  // ── Interaction State ────────────────────────────────────────
  const [draggingBall, setDraggingBall] = useState(null);
  const [draggingVertex, setDraggingVertex] = useState(null); // { lineId, pointIndex }
  const [draggingText, setDraggingText] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [currentLinePoints, setCurrentLinePoints] = useState(null);
  const [mousePreviewPoint, setMousePreviewPoint] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);

  // ── Canvas size — fills available space keeping 2:1 aspect ratio ──
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 499 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const availW = container.clientWidth  - 56; // horizontal padding (48px) + border/clearance
      const availH = container.clientHeight - 58; // vertical padding (28px) + gap + hint bar
      if (availW <= 0 || availH <= 0) return;
      // Real 3-cushion table aspect ratio (3.19m x 1.77m total outer dimensions)
      const TABLE_RATIO = 3190 / 1770; // ~1.80226
      let w = availW;
      let h = w / TABLE_RATIO;
      if (h > availH) {
        h = availH;
        w = h * TABLE_RATIO;
      }
      if (w < 240) {
        w = 240;
        h = w / TABLE_RATIO;
      }
      setDimensions({ width: Math.round(w), height: Math.round(h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Coordinate Helpers ───────────────────────────────────────
  // Based on official UMB specs:
  // Playing field: 2840mm x 1420mm (exact 2:1)
  // Total border: 175mm on each side (50mm cushion + 125mm wood rail)
  // Outer table: 3190mm x 1770mm
  const normToPx = useCallback((nx, ny) => {
    const marginX = dimensions.width * (175 / 3190);
    const marginY = dimensions.height * (175 / 1770);
    const playWidth = dimensions.width - marginX * 2;
    const playHeight = dimensions.height - marginY * 2;
    const ballRadius = Math.max(6, playWidth * (30.75 / 2840));
    return {
      x: marginX + nx * playWidth,
      y: marginY + ny * playHeight,
      marginX, marginY, playWidth, playHeight, ballRadius,
    };
  }, [dimensions]);

  const pxToNorm = useCallback((px, py) => {
    const marginX = dimensions.width * (175 / 3190);
    const marginY = dimensions.height * (175 / 1770);
    const playWidth = dimensions.width - marginX * 2;
    const playHeight = dimensions.height - marginY * 2;
    // Normalized bounds that also cover the wooden bands (rails).
    // 0..1 is the cloth; negative / >1 values fall on the bands.
    const minNx = -marginX / playWidth;
    const maxNx = 1 + marginX / playWidth;
    const minNy = -marginY / playHeight;
    const maxNy = 1 + marginY / playHeight;
    return {
      nx: Math.max(minNx, Math.min(maxNx, (px - marginX) / playWidth)),
      ny: Math.max(minNy, Math.min(maxNy, (py - marginY) / playHeight)),
    };
  }, [dimensions]);

  // ── Visual Alignment Guide Helper (Magnet effect for Points & Text) ────────
  const getSnapGuides = useCallback((nx, ny, activeId = null) => {
    if (!showAlignmentGuides) return { snappedNx: nx, snappedNy: ny, guides: [] };

    const currPx = normToPx(nx, ny);
    const SNAP_THRESHOLD_PX = 8;

    const targets = [];

    // 1. Diamond alignment targets (full-table guides)
    if (showDetailedPoints) {
      for (let i = 0; i <= 16; i++) {
        targets.push({ id: `d-top-${i}`, x: i / 16, y: 0 });
        targets.push({ id: `d-bot-${i}`, x: i / 16, y: 1 });
      }
      for (let j = 0; j <= 8; j++) {
        targets.push({ id: `d-left-${j}`, x: 0, y: j / 8 });
        targets.push({ id: `d-right-${j}`, x: 1, y: j / 8 });
      }

      // 1b. Detailed 1/10 point magnet targets along rails/cushions
      const topLeftPx = normToPx(0, 0);
      const botRightPx = normToPx(1, 1);
      const RAIL_ZONE_PX = 48;

      if (Math.abs(currPx.y - topLeftPx.y) <= RAIL_ZONE_PX) {
        for (let k = 0; k <= 80; k++) {
          targets.push({ id: `d10-top-${k}`, x: k / 80, y: 0 });
        }
      }
      if (Math.abs(currPx.y - botRightPx.y) <= RAIL_ZONE_PX) {
        for (let k = 0; k <= 80; k++) {
          targets.push({ id: `d10-bot-${k}`, x: k / 80, y: 1 });
        }
      }
      if (Math.abs(currPx.x - topLeftPx.x) <= RAIL_ZONE_PX) {
        for (let k = 0; k <= 40; k++) {
          targets.push({ id: `d10-left-${k}`, x: 0, y: k / 40 });
        }
      }
      if (Math.abs(currPx.x - botRightPx.x) <= RAIL_ZONE_PX) {
        for (let k = 0; k <= 40; k++) {
          targets.push({ id: `d10-right-${k}`, x: 1, y: k / 40 });
        }
      }
    } else {
      for (let i = 0; i <= 8; i++) {
        targets.push({ id: `d-top-${i}`, x: i / 8, y: 0 });
        targets.push({ id: `d-bot-${i}`, x: i / 8, y: 1 });
      }
      for (let j = 0; j <= 4; j++) {
        targets.push({ id: `d-left-${j}`, x: 0, y: j / 4 });
        targets.push({ id: `d-right-${j}`, x: 1, y: j / 4 });
      }
    }

    // 2. Points (excluding current point being moved)
    (points || []).forEach(p => {
      if (p.id !== activeId) {
        targets.push({ id: p.id, x: p.x, y: p.y });
      }
    });

    // 3. Texts (excluding current text being moved)
    (texts || []).forEach(t => {
      if (t.id !== activeId) {
        targets.push({ id: t.id, x: t.x, y: t.y });
      }
    });

    // 4. Official UMB Reference Spots on the cloth (when enabled)
    if (showReferenceSpots) {
      targets.push(
        { id: 'ref-head', x: 0.25, y: 0.5 },
        { id: 'ref-head-top', x: 0.25, y: 0.5 - 18.5 / 142 },
        { id: 'ref-head-bot', x: 0.25, y: 0.5 + 18.5 / 142 },
        { id: 'ref-center', x: 0.5, y: 0.5 },
        { id: 'ref-foot', x: 0.75, y: 0.5 }
      );
    }

    // Note: Balls are deliberately excluded so magnet snapping ONLY applies between points, text & diamond marks.

    const guides = [];
    let minDiffX = SNAP_THRESHOLD_PX;
    let bestTgtX = null;
    let minDiffY = SNAP_THRESHOLD_PX;
    let bestTgtY = null;

    targets.forEach(t => {
      const tgtPx = normToPx(t.x, t.y);
      const diffX = Math.abs(currPx.x - tgtPx.x);
      if (diffX < minDiffX) {
        minDiffX = diffX;
        bestTgtX = { x: t.x, px: tgtPx.x };
      }
      const diffY = Math.abs(currPx.y - tgtPx.y);
      if (diffY < minDiffY) {
        minDiffY = diffY;
        bestTgtY = { y: t.y, py: tgtPx.y };
      }
    });

    let snappedNx = nx;
    let snappedNy = ny;

    if (bestTgtX) {
      snappedNx = bestTgtX.x;
    }
    if (bestTgtY) {
      snappedNy = bestTgtY.y;
    }

    const finalPx = normToPx(snappedNx, snappedNy);

    if (bestTgtX) {
      guides.push({ axis: 'x', px: bestTgtX.px, py: finalPx.y });
    }
    if (bestTgtY) {
      guides.push({ axis: 'y', px: finalPx.x, py: bestTgtY.py });
    }

    return { snappedNx, snappedNy, guides };
  }, [showAlignmentGuides, showDetailedPoints, showReferenceSpots, points, texts, normToPx]);

  // ── Line Actions ─────────────────────────────────────────────
  const finishCurrentLine = useCallback(() => {
    if (currentLinePoints && currentLinePoints.length >= 2) {
      const color = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      const newLine = {
        id: `line-${Date.now()}`,
        points: [...currentLinePoints],
        color,
        style: 'solid',
        width: 2,
        isArrow: activeTool === 'arrow',
      };
      setLines(prev => [...prev, newLine]);
      setSelectedLineId(newLine.id);
    }
    setCurrentLinePoints(null);
    setMousePreviewPoint(null);
  }, [currentLinePoints, activeTool]);

  const dropSelectedLine = useCallback(() => {
    if (selectedLineId) {
      setLines(prev => prev.filter(l => l.id !== selectedLineId));
      setSelectedLineId(null);
    }
  }, [selectedLineId]);

  const updateSelectedLine = useCallback((patch) => {
    if (!selectedLineId) return;
    setLines(prev => prev.map(l => (l.id === selectedLineId ? { ...l, ...patch } : l)));
  }, [selectedLineId]);

  // ── Notify Parent ────────────────────────────────────────────
  useEffect(() => {
    if (onLineStateChange) {
      onLineStateChange({
        isDrawingLine: !!(currentLinePoints && currentLinePoints.length >= 1),
        finishLine: finishCurrentLine,
        selectedLineId,
        dropSelectedLine,
        updateSelectedLine,
        selectedLine: lines.find(l => l.id === selectedLineId) || null,
      });
    }
  }, [currentLinePoints, selectedLineId, finishCurrentLine, dropSelectedLine, updateSelectedLine, onLineStateChange, lines]);

  // ── Main Render Loop ─────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    ctx.clearRect(0, 0, width, height);

    const marginX = width * (175 / 3190);
    const marginY = height * (175 / 1770);
    const playWidth = width - marginX * 2;
    const playHeight = height - marginY * 2;
    const ballRadius = Math.max(6, playWidth * (30.75 / 2840));

    // Real table components:
    // 50mm rubber cushion out of 175mm total border = 50 / 175
    // 125mm wooden rail: center of rail from outer edge = 62.5 / 175
    const cushionW = marginX * (50 / 175);
    const cushionH = marginY * (50 / 175);
    const railCenterX = marginX * (62.5 / 175);
    const railCenterY = marginY * (62.5 / 175);

    // 1. Outer wooden rail
    ctx.fillStyle = getRailColor(clothColor);
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, height - 6, width, 6);

    // 2. Rubber cushion band (wrapped in cloth, with natural bevel depth shading)
    ctx.fillStyle = clothColor;
    ctx.fillRect(marginX - cushionW, marginY - cushionH, playWidth + cushionW * 2, playHeight + cushionH * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(marginX - cushionW, marginY - cushionH, playWidth + cushionW * 2, playHeight + cushionH * 2);

    // 3. Flat playing surface (pizarra / paño de juego)
    ctx.fillStyle = clothColor;
    ctx.fillRect(marginX, marginY, playWidth, playHeight);

    // Cushion nose bevel (arista de rebote)
    ctx.strokeStyle = 'rgba(0,0,0,0.50)';
    ctx.lineWidth = Math.max(1.5, playWidth * 0.0025);
    ctx.setLineDash([]);
    ctx.strokeRect(marginX, marginY, playWidth, playHeight);

    // Corner mitre lines (corte a 45° en las esquinas de las bandas)
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.lineWidth = Math.max(1, playWidth * 0.0018);
    ctx.beginPath();
    ctx.moveTo(marginX - cushionW, marginY - cushionH);
    ctx.lineTo(marginX, marginY);
    ctx.moveTo(marginX + playWidth + cushionW, marginY - cushionH);
    ctx.lineTo(marginX + playWidth, marginY);
    ctx.moveTo(marginX - cushionW, marginY + playHeight + cushionH);
    ctx.lineTo(marginX, marginY + playHeight);
    ctx.moveTo(marginX + playWidth + cushionW, marginY + playHeight + cushionH);
    ctx.lineTo(marginX + playWidth, marginY + playHeight);
    ctx.stroke();

    // 3. Diamond markers & Detailed points (centered in 125mm wooden rail)
    if (showDetailedPoints) {
      const dr = Math.max(3, playWidth * 0.004);
      const rMajor = Math.max(3.6, dr * 0.95);
      const rHalf  = Math.max(2.2, dr * 0.58);
      const rTenth = Math.max(1.3, dr * 0.35);

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
        const lw = isMajor ? 1 : isHalf ? 0.8 : 0.6;
        drawDot(x, railCenterY, r, lw);
        drawDot(x, height - railCenterY, r, lw);
      }

      // Short rails: 40 subdivisions (4 diamonds * 10)
      for (let k = 0; k <= 40; k++) {
        const y = marginY + (k / 40) * playHeight;
        const isMajor = k % 10 === 0;
        const isHalf  = k % 5 === 0;
        const r  = isMajor ? rMajor : isHalf ? rHalf : rTenth;
        const lw = isMajor ? 1 : isHalf ? 0.8 : 0.6;
        drawDot(railCenterX, y, r, lw);
        drawDot(width - railCenterX, y, r, lw);
      }
    } else if (showDiamonds) {
      const dr = Math.max(3, playWidth * 0.004);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
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
        drawDiamond(marginX + (i / 8) * playWidth, railCenterY);
        drawDiamond(marginX + (i / 8) * playWidth, height - railCenterY);
      }
      for (let j = 0; j <= 4; j++) {
        drawDiamond(railCenterX, marginY + (j / 4) * playHeight);
        drawDiamond(width - railCenterX, marginY + (j / 4) * playHeight);
      }
    }

    // 3.5 Official UMB Reference Spots on the cloth
    if (showReferenceSpots) {
      const refSpots = [
        { x: 0.25, y: 0.5 },                // Head spot (71 cm)
        { x: 0.25, y: 0.5 - 18.5 / 142 },   // Side break spot (-18.5 cm)
        { x: 0.25, y: 0.5 + 18.5 / 142 },   // Side break spot (+18.5 cm)
        { x: 0.5,  y: 0.5 },                // Center spot
        { x: 0.75, y: 0.5 },                // Foot spot (71 cm)
      ];
      const dotR = Math.max(2.5, playWidth * 0.003);
      ctx.save();
      ctx.fillStyle = '#090d16';
      refSpots.forEach((s) => {
        const pt = normToPx(s.x, s.y);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 4. Draw polygonal lines
    // Include both finalized lines and any active line currently in progress (with >= 2 points) during capture
    const linesToDraw = [...lines];
    if (captureModeRef.current && currentLinePoints && currentLinePoints.length >= 2) {
      linesToDraw.push({
        id: '__in_progress__',
        points: currentLinePoints,
        color: activeTool === 'arrow' ? '#f59e0b' : '#06b6d4',
        style: 'solid',
        width: 2,
        isArrow: activeTool === 'arrow',
      });
    }

    linesToDraw.forEach((line) => {
      if (!line.points || line.points.length < 2) return;
      const isSelected = line.id === selectedLineId;
      const lw = line.width || 2;

      const applyDash = () => {
        if (line.style === 'dashed') ctx.setLineDash([lw * 6, lw * 3]);
        else if (line.style === 'dotted') ctx.setLineDash([lw * 1.5, lw * 4]);
        else ctx.setLineDash([]);
      };

      // During capture, treat every line as unselected (no editing UI).
      const showSelection = isSelected && !captureModeRef.current;

      // Selection glow (no dash for the glow)
      if (showSelection) {
        const g0 = normToPx(line.points[0].x, line.points[0].y);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56,189,248,0.30)';
        ctx.lineWidth = lw + 8;
        ctx.setLineDash([]);
        ctx.moveTo(g0.x, g0.y);
        for (let i = 1; i < line.points.length; i++) {
          const gp = normToPx(line.points[i].x, line.points[i].y);
          ctx.lineTo(gp.x, gp.y);
        }
        ctx.stroke();
      }

      // Main line
      applyDash();
      const p0 = normToPx(line.points[0].x, line.points[0].y);
      ctx.beginPath();
      ctx.strokeStyle = showSelection ? '#38bdf8' : (line.color || '#06b6d4');
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
        const al = Math.max(10, playWidth * 0.013) + lw;
        ctx.fillStyle = showSelection ? '#38bdf8' : (line.color || '#06b6d4');
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x - al * Math.cos(angle - Math.PI / 6), last.y - al * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(last.x - al * Math.cos(angle + Math.PI / 6), last.y - al * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // Vertex handles (only for selected line, never during capture)
      if (showSelection) {
        line.points.forEach((ptNorm, idx) => {
          const pt = normToPx(ptNorm.x, ptNorm.y);
          const isDraggingThis = draggingVertex &&
            draggingVertex.lineId === line.id &&
            draggingVertex.pointIndex === idx;
          const r = isDraggingThis ? 9 : 6;

          // Outer glow ring
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56,189,248,0.20)';
          ctx.fill();

          // Main handle
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isDraggingThis ? '#ffffff' : '#38bdf8';
          ctx.strokeStyle = isDraggingThis ? '#06b6d4' : '#ffffff';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          // Index label inside handle
          ctx.fillStyle = isDraggingThis ? '#06b6d4' : '#0f172a';
          ctx.font = `700 ${Math.round(r * 1.1)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), pt.x, pt.y);
        });
      }
    });

    // 5. Active drawing preview (editing only — skipped during capture since linesToDraw renders it)
    if (currentLinePoints && currentLinePoints.length >= 1 && !captureModeRef.current) {
      const activePts = [...currentLinePoints];
      if (mousePreviewPoint) activePts.push(mousePreviewPoint);

      ctx.beginPath();
      ctx.strokeStyle = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const a0 = normToPx(activePts[0].x, activePts[0].y);
      ctx.moveTo(a0.x, a0.y);
      for (let i = 1; i < activePts.length; i++) {
        const ap = normToPx(activePts[i].x, activePts[i].y);
        ctx.lineTo(ap.x, ap.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      currentLinePoints.forEach((ptNorm) => {
        const pt = normToPx(ptNorm.x, ptNorm.y);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
        ctx.fill();
      });
    } else if ((activeTool === 'line' || activeTool === 'arrow') && mousePreviewPoint && !captureModeRef.current) {
      const pt = normToPx(mousePreviewPoint.x, mousePreviewPoint.y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = activeTool === 'arrow' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(6, 182, 212, 0.45)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      ctx.stroke();
      ctx.restore();
    }

    // 5.5 Points placed over table (including cloth & wooden bands/rails)
    (points || []).forEach((ptNorm) => {
      const pt = normToPx(ptNorm.x, ptNorm.y);
      const baseR = ptNorm.radius || pointRadius || 8;
      const radius = Math.max(2, baseR * (playWidth / 819));
      const isSelected = ptNorm.id === selectedPointId && !captureModeRef.current;
      const col = ptNorm.color || pointColor || '#ef4444';

      ctx.save();

      // Selection glow ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Shadow for 3D dot effect
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = Math.max(2, radius * 0.4);
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      // Radial gradient dot
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
      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.75)';
      ctx.stroke();

      ctx.restore();
    });

    // Preview for point tool
    if (activeTool === 'point' && mousePreviewPoint && !captureModeRef.current) {
      const pt = normToPx(mousePreviewPoint.x, mousePreviewPoint.y);
      const radius = Math.max(2, (pointRadius || 8) * (playWidth / 819));
      const col = pointColor || '#ef4444';

      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 6. Text annotations (direct clean text with NO background color box)
    const TEXT_SIZE_SCALES = { xs: 0.55, s: 0.75, m: 1.0, l: 1.4, xl: 1.9 };
    texts.forEach((t) => {
      const pt        = normToPx(t.x, t.y);
      const sizeKey   = t.size ?? textSize ?? 'm';
      const sizeScale = TEXT_SIZE_SCALES[sizeKey] ?? 1.0;
      const fontSize  = Math.max(12, Math.round(playWidth * 0.015 * sizeScale));
      const isSelected = t.id === selectedTextId && !captureModeRef.current;
      const col = t.color || textColor || '#f59e0b';

      ctx.save();
      ctx.font = `700 ${fontSize}px Inter, sans-serif`;
      const metrics = ctx.measureText(t.text);
      const bgW = metrics.width + 10;
      const bgH = fontSize + 6;

      // Selection outline ring when text is selected (dashed stroke only, NO background fill!)
      if (isSelected) {
        ctx.beginPath();
        drawRoundedRect(ctx, pt.x - bgW / 2, pt.y - bgH / 2, bgW, bgH, 4);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Subtle text shadow for high contrast without adding any background box color
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Text content
      ctx.fillStyle    = col;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, pt.x, pt.y);
      ctx.restore();
    });

    // 7. Balls
    const ballKeys = ['white', 'yellow', 'red'];
    ballKeys.forEach((key) => {
      const b = balls[key];
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
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = key === 'white' ? '#cbd5e1' : key === 'yellow' ? '#eab308' : '#991b1b';
      ctx.stroke();

      if (r >= 8) {
        ctx.fillStyle = key === 'white' ? '#0f172a' : key === 'yellow' ? '#0f172a' : '#ffffff';
        ctx.font = `700 ${Math.round(r * 0.95)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, pt.x, pt.y);
      }

    });

    // 8. Strike & Spin widget (Toma y Efecto) — baked onto the canvas at
    //    capture time so it appears in PNG exports and movie screenshots.
    //    On the live canvas the interactive HTML StrikePanel is shown
    //    instead, so we only draw here while capturing.
    if (strikeMode && captureModeRef.current) {
      const cardW = Math.min(260, playWidth * 0.34);
      const cardH = cardW * (128 / 260);
      const cardX = marginX + playWidth - cardW - 12;
      const cardY = marginY + playHeight - cardH - 12;
      const rad = 12;

      ctx.save();

      // Card background (table cloth color) with dark border + inner shade
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, rad);
      ctx.fillStyle = clothColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();

      // Clip to the card for inner content
      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, rad);
      ctx.clip();

      // Fullness fraction label
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

      const headerH = 20;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '700 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('TOMA / EFECTO', cardX + 8, cardY + headerH / 2 + 1);

      // Fraction badge
      const badgeText = fraction;
      ctx.font = '800 11px monospace';
      const bw = ctx.measureText(badgeText).width + 12;
      const bx = cardX + 8 + ctx.measureText('TOMA / EFECTO').width * (9 / 11) + 12;
      ctx.font = '700 9px Inter, sans-serif';
      const labelW = ctx.measureText('TOMA / EFECTO').width;
      const badgeX = cardX + 8 + labelW + 8;
      const badgeY = cardY + 3;
      const badgeH = 15;
      drawRoundedRect(ctx, badgeX, badgeY, bw, badgeH, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.font = '800 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX + bw / 2, badgeY + badgeH / 2 + 1);
      void bx;

      // Stage geometry
      const stageTop = cardY + headerH;
      const stageH = cardH - headerH;
      const cx = cardX + cardW / 2;
      const cy = stageTop + stageH / 2;
      const ballR = Math.min(cardH * 0.24, cardW * 0.12);
      const shiftX = strike * (ballR * 2); // ±1 → tangent (one diameter)

      // Center reference line
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, stageTop + 12);
      ctx.lineTo(cx, stageTop + stageH - 12);
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
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = labelCol;
        ctx.font = `700 ${Math.round(ballR * 0.55)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx2, by2);
      };

      // Yellow "2" (object ball) — offset horizontally, drawn under
      drawWidgetBall(cx + shiftX, cy, '#fde68a', '#f5c518', '#c98a04', 'rgba(202,138,4,0.85)', '2', '#78350f');

      // White "1" (cue ball) — fixed center, on top, holds spin marker
      drawWidgetBall(cx, cy, '#ffffff', '#dfe6ee', '#9aa7b6', 'rgba(203,213,225,0.75)', '1', '#475569');

      // Spin / tip contact marker on the white ball
      const mkX = cx + spin.x * ballR * 0.8;
      const mkY = cy - spin.y * ballR * 0.8;
      ctx.beginPath();
      ctx.arc(mkX, mkY, Math.max(3, ballR * 0.16), 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore(); // clip
      ctx.restore(); // save
    }

    // 7.5 Alignment Guides (vertical & horizontal snap lines)
    if (showAlignmentGuides && activeGuides && activeGuides.length > 0 && !captureModeRef.current) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;

      activeGuides.forEach((g) => {
        ctx.beginPath();
        if (g.axis === 'x') {
          ctx.strokeStyle = '#38bdf8';
          ctx.moveTo(g.px, 0);
          ctx.lineTo(g.px, height);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(g.px, g.py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        } else if (g.axis === 'y') {
          ctx.strokeStyle = '#38bdf8';
          ctx.moveTo(0, g.py);
          ctx.lineTo(width, g.py);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(g.px, g.py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        }
      });
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [dimensions, clothColor, showDiamonds, showDetailedPoints, showReferenceSpots, showAlignmentGuides, activeGuides, balls, lines, texts, points, pointRadius, pointColor, selectedPointId, selectedTextId,
    currentLinePoints, mousePreviewPoint,
    selectedLineId, activeTool, normToPx, draggingVertex,
    strikeMode, spin, strike]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // ── Pointer Handlers ─────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { nx, ny } = pxToNorm(px, py);

    // ── Shared text hit-box helper (uses actual font metrics) ──
    // Mirrors the same fontSize formula used in the render loop.
    const textHitBox = (t) => {
      const { x: cx, y: cy, playWidth: pw } = normToPx(t.x, t.y);
      const TEXT_SIZE_SCALES = { xs: 0.55, s: 0.75, m: 1.0, l: 1.4, xl: 1.9 };
      const sizeScale = TEXT_SIZE_SCALES[t.size ?? textSize ?? 'm'] ?? 1.0;
      const fontSize  = Math.max(12, Math.round(pw * 0.015 * sizeScale));
      // Approximate glyph width: use a generous char-width estimate (0.65×fontSize per char)
      const approxW = Math.max(40, t.text.length * fontSize * 0.65) + 10;
      const approxH = fontSize + 6;
      return {
        left:   cx - approxW / 2,
        right:  cx + approxW / 2,
        top:    cy - approxH / 2,
        bottom: cy + approxH / 2,
      };
    };

    const hitsText = (t) => {
      const b = textHitBox(t);
      return px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
    };

    // ── Point tool ──
    if (activeTool === 'point') {
      const { snappedNx, snappedNy } = getSnapGuides(nx, ny, null);
      const newPoint = {
        id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: snappedNx,
        y: snappedNy,
        radius: pointRadius,
        color: pointColor,
      };
      setPoints(prev => [...prev, newPoint]);
      setSelectedPointId(newPoint.id);
      setSelectedLineId(null);
      setSelectedTextId(null);
      return;
    }

    // ── Move tool ──
    if (activeTool === 'move') {
      // Priority 1: text annotations (checked FIRST so they win over shapes beneath)
      for (const t of texts) {
        if (hitsText(t)) {
          setDraggingText(t.id);
          setSelectedTextId(t.id);
          setSelectedLineId(null);
          setSelectedPointId(null);
          return;
        }
      }

      // Priority 2: vertex of selected line
      if (selectedLineId) {
        const selLine = lines.find(l => l.id === selectedLineId);
        if (selLine) {
          for (let i = 0; i < selLine.points.length; i++) {
            const vpt = normToPx(selLine.points[i].x, selLine.points[i].y);
            if (Math.hypot(px - vpt.x, py - vpt.y) <= 12) {
              setDraggingVertex({ lineId: selectedLineId, pointIndex: i });
              return;
            }
          }
        }
      }

      // Priority 3: points placed on table or bands
      for (const p of points) {
        const ppt = normToPx(p.x, p.y);
        const pr = Math.max(10, (p.radius || pointRadius || 8) * (dimensions.width / 900) + 4);
        if (Math.hypot(px - ppt.x, py - ppt.y) <= pr) {
          setDraggingPoint(p.id);
          setSelectedPointId(p.id);
          setSelectedLineId(null);
          setSelectedTextId(null);
          return;
        }
      }

      // Priority 4: balls
      for (const key of ['white', 'yellow', 'red']) {
        const bpt = normToPx(balls[key].x, balls[key].y);
        if (Math.hypot(px - bpt.x, py - bpt.y) <= 24) {
          setDraggingBall(key);
          setSelectedLineId(null);
          setSelectedPointId(null);
          setSelectedTextId(null);
          return;
        }
      }

      // Priority 5: line segment → select
      for (const line of lines) {
        for (let i = 0; i < line.points.length - 1; i++) {
          const p1 = normToPx(line.points[i].x, line.points[i].y);
          const p2 = normToPx(line.points[i + 1].x, line.points[i + 1].y);
          const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
          if (l2 === 0) continue;
          let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p1.x + t * (p2.x - p1.x);
          const projY = p1.y + t * (p2.y - p1.y);
          if (Math.hypot(px - projX, py - projY) < 12) {
            setSelectedLineId(line.id);
            setSelectedPointId(null);
            setSelectedTextId(null);
            return;
          }
        }
      }

      setSelectedLineId(null);
      setSelectedPointId(null);
      setSelectedTextId(null);
      return;
    }

    // ── Line / Arrow drawing ──
    if (activeTool === 'line' || activeTool === 'arrow') {
      const { snappedNx, snappedNy } = getSnapGuides(nx, ny, null);
      if (!currentLinePoints) {
        setCurrentLinePoints([{ x: snappedNx, y: snappedNy }]);
      } else {
        setCurrentLinePoints(prev => [...prev, { x: snappedNx, y: snappedNy }]);
      }
      return;
    }

    // ── Text tool ──
    if (activeTool === 'text') {
      const { snappedNx, snappedNy } = getSnapGuides(nx, ny, null);
      const labelText = prompt('Ingrese texto o número para la jugada:', 'Ataque 30');
      if (labelText && labelText.trim()) {
        const newText = {
          id: `text-${Date.now()}`,
          x: snappedNx,
          y: snappedNy,
          text: labelText.trim(),
          color: textColor || '#f59e0b',
          size: textSize || 'm',
        };
        setTexts(prev => [...prev, newText]);
        setSelectedTextId(newText.id);
        setSelectedPointId(null);
        setSelectedLineId(null);
      }
      return;
    }

    // ── Eraser ──
    if (activeTool === 'eraser') {
      // Check points first
      const hitPointIdx = points.findIndex(p => {
        const ppt = normToPx(p.x, p.y);
        const pr = Math.max(10, (p.radius || pointRadius || 8) * (dimensions.width / 900) + 4);
        return Math.hypot(px - ppt.x, py - ppt.y) <= pr;
      });
      if (hitPointIdx !== -1) {
        const targetId = points[hitPointIdx]?.id;
        setPoints(prev => prev.filter(p => p.id !== targetId));
        if (selectedPointId === targetId) setSelectedPointId(null);
        return;
      }

      // Check text annotations
      const hitIdx = texts.findIndex(t => hitsText(t));
      if (hitIdx !== -1) {
        const targetId = texts[hitIdx]?.id;
        setTexts(prev => prev.filter(t => t.id !== targetId));
        if (selectedTextId === targetId) setSelectedTextId(null);
        return;
      }
      if (lines.length > 0) setLines(prev => prev.slice(0, -1));
    }
  }, [activeTool, selectedLineId, selectedPointId, selectedTextId, lines, balls, currentLinePoints, texts, points, pointRadius, pointColor, textColor, textSize, normToPx, pxToNorm, getSnapGuides, setPoints, setSelectedPointId, setTexts, setSelectedTextId]);

  const handlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { nx, ny } = pxToNorm(px, py);

    if (draggingVertex) {
      const { snappedNx, snappedNy, guides } = getSnapGuides(nx, ny, null);
      setLines(prev =>
        prev.map(l => {
          if (l.id !== draggingVertex.lineId) return l;
          const pts = [...l.points];
          pts[draggingVertex.pointIndex] = { x: snappedNx, y: snappedNy };
          return { ...l, points: pts };
        })
      );
      setActiveGuides(guides);
      return;
    }

    if (draggingPoint) {
      const { snappedNx, snappedNy, guides } = getSnapGuides(nx, ny, draggingPoint);
      setPoints(prev => prev.map(p => (p.id === draggingPoint ? { ...p, x: snappedNx, y: snappedNy } : p)));
      setActiveGuides(guides);
      return;
    }

    if (draggingBall) {
      setBalls(prev => ({ ...prev, [draggingBall]: { ...prev[draggingBall], x: nx, y: ny } }));
      setActiveGuides([]);
      return;
    }

    if (draggingText) {
      const { snappedNx, snappedNy, guides } = getSnapGuides(nx, ny, draggingText);
      setTexts(prev => prev.map(t => (t.id === draggingText ? { ...t, x: snappedNx, y: snappedNy } : t)));
      setActiveGuides(guides);
      return;
    }

    if (currentLinePoints || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'point' || activeTool === 'text') {
      const { snappedNx, snappedNy, guides } = getSnapGuides(nx, ny, null);
      setMousePreviewPoint({ x: snappedNx, y: snappedNy });
      setActiveGuides(guides);
    } else {
      setActiveGuides(prev => (prev.length > 0 ? [] : prev));
    }
  }, [draggingVertex, draggingPoint, draggingBall, draggingText, currentLinePoints, activeTool, pxToNorm, getSnapGuides, setPoints, setTexts]);

  const handlePointerUp = useCallback(() => {
    setActiveGuides([]);
    if (draggingVertex) { setDraggingVertex(null); return; }
    if (draggingPoint) { setDraggingPoint(null); return; }
    if (draggingBall) { setDraggingBall(null); return; }
    if (draggingText) { setDraggingText(null); }
  }, [draggingVertex, draggingPoint, draggingBall, draggingText]);

  const handleDoubleClick = useCallback(() => {
    if (currentLinePoints && currentLinePoints.length >= 2) finishCurrentLine();
  }, [currentLinePoints, finishCurrentLine]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape' && currentLinePoints) finishCurrentLine();
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextId) {
          setTexts(prev => prev.filter(t => t.id !== selectedTextId));
          setSelectedTextId(null);
        } else if (selectedPointId) {
          setPoints(prev => prev.filter(p => p.id !== selectedPointId));
          setSelectedPointId(null);
        } else if (selectedLineId && !currentLinePoints) {
          dropSelectedLine();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentLinePoints, selectedLineId, selectedPointId, selectedTextId, finishCurrentLine, dropSelectedLine, setPoints, setSelectedPointId, setTexts, setSelectedTextId]);

  // ── PNG Export (Full HD 1080p) ───────────────────────────────
  const exportPNG = useCallback(() => {
    let activeLines = [...lines];
    if (currentLinePoints && currentLinePoints.length >= 2) {
      finishCurrentLine();
      const color = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      activeLines.push({
        id: `line-${Date.now()}`,
        points: [...currentLinePoints],
        color,
        style: 'solid',
        width: 2,
        isArrow: activeTool === 'arrow',
      });
    }

    const hdCanvas = document.createElement('canvas');
    renderDiagramToCanvas({
      canvas: hdCanvas,
      width: 1920,
      height: 1066,
      clothColor,
      showDiamonds,
      showDetailedPoints,
      showReferenceSpots,
      balls,
      lines: activeLines,
      points,
      texts,
      strikeMode,
      spin,
      strike,
      showHeader: false,
      showWatermark: true,
      showStrikeWidget: strikeMode,
    });

    const dataUrl = hdCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `billiard-diagram-HD-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [lines, currentLinePoints, finishCurrentLine, activeTool, clothColor, showDiamonds, showDetailedPoints, showReferenceSpots, balls, points, texts, strikeMode, spin, strike]);

  useEffect(() => {
    if (onRegisterExportHandler) onRegisterExportHandler(() => exportPNG);
  }, [onRegisterExportHandler, exportPNG]);

  // ── Frame capture in HD (for movie feature) ───────────────────
  const captureFrame = useCallback((options = {}) => {
    let activeLines = [...lines];
    if (currentLinePoints && currentLinePoints.length >= 2) {
      finishCurrentLine();
      const color = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      activeLines.push({
        id: `line-${Date.now()}`,
        points: [...currentLinePoints],
        color,
        style: 'solid',
        width: 2,
        isArrow: activeTool === 'arrow',
      });
    }

    const showHeader = options.showHeader ?? false;
    const titleText = options.titleText ?? 'Billiard Sketcher — Animación 3 Bandas';
    const showWatermark = options.showWatermark ?? true;
    const watermarkText = options.watermarkText ?? 'Billiard Sketcher • 3-Bandas HD';

    const hdCanvas = document.createElement('canvas');
    renderDiagramToCanvas({
      canvas: hdCanvas,
      width: 1920,
      height: 1066,
      clothColor,
      showDiamonds,
      showDetailedPoints,
      showReferenceSpots,
      balls,
      lines: activeLines,
      points,
      texts,
      strikeMode,
      spin,
      strike,
      showHeader,
      titleText,
      showWatermark,
      watermarkText,
      showStrikeWidget: strikeMode,
    });

    const dataUrl = hdCanvas.toDataURL('image/png');
    return {
      dataUrl,
      width: 1920,
      height: 1066,
    };
  }, [lines, currentLinePoints, finishCurrentLine, activeTool, clothColor, showDiamonds, showDetailedPoints, showReferenceSpots, balls, points, texts, strikeMode, spin, strike]);

  useEffect(() => {
    if (onRegisterCaptureHandler) onRegisterCaptureHandler(() => captureFrame);
  }, [onRegisterCaptureHandler, captureFrame]);

  // ── JSON Import / Export Helpers ─────────────────────────────
  const getDiagramData = useCallback(() => {
    return {
      version: '1.0',
      generator: 'Billiard Sketcher',
      timestamp: Date.now(),
      table: {
        clothColor,
        showDiamonds,
        showDetailedPoints,
        showReferenceSpots,
        showAlignmentGuides,
      },
      balls,
      lines,
      points,
      texts,
      strike: {
        spin,
        strike,
        strikeMode,
      },
    };
  }, [clothColor, showDiamonds, showDetailedPoints, showReferenceSpots, showAlignmentGuides, balls, lines, points, texts, spin, strike, strikeMode]);

  const loadDiagramData = useCallback((data) => {
    if (!data) return;
    if (data.balls) setBalls(data.balls);
    if (data.lines) setLines(data.lines);
    if (data.points) setPoints(data.points);
    if (data.texts) setTexts(data.texts);
    if (data.table?.clothColor) setClothColor(data.table.clothColor);
    if (data.table?.showDiamonds !== undefined) setShowDiamonds(data.table.showDiamonds);
    if (data.table?.showDetailedPoints !== undefined) setShowDetailedPoints(data.table.showDetailedPoints);
    if (data.table?.showReferenceSpots !== undefined) setShowReferenceSpots(data.table.showReferenceSpots);
    if (data.table?.showAlignmentGuides !== undefined) setShowAlignmentGuides(data.table.showAlignmentGuides);
    if (data.strike?.spin) setSpin(data.strike.spin);
    if (data.strike?.strike !== undefined) setStrike(data.strike.strike);
    if (data.strike?.strikeMode !== undefined) setStrikeMode(data.strike.strikeMode);
  }, [setPoints, setTexts, setClothColor, setShowDiamonds, setShowDetailedPoints, setShowReferenceSpots, setShowAlignmentGuides, setSpin, setStrike, setStrikeMode]);

  useEffect(() => {
    if (onRegisterJsonHandler) {
      onRegisterJsonHandler(() => ({ getDiagramData, loadDiagramData }));
    }
  }, [onRegisterJsonHandler, getDiagramData, loadDiagramData]);

  // ── Status hint text ─────────────────────────────────────────
  let hintText = 'Selecciona "Línea Poligonal" para dibujar recorridos continuos.';
  if (draggingVertex) hintText = `Moviendo vértice ${draggingVertex.pointIndex + 1}…`;
  else if (draggingPoint) hintText = 'Moviendo punto…';
  else if (draggingText) hintText = 'Moviendo texto…';
  else if (activeTool === 'point')
    hintText = 'Haz clic en cualquier posición de la mesa (incluidas bandas) para colocar un punto.';
  else if (activeTool === 'text')
    hintText = 'Haz clic en cualquier posición de la mesa para ingresar texto.';
  else if (currentLinePoints)
    hintText = `${currentLinePoints.length} punto${currentLinePoints.length !== 1 ? 's' : ''} — Doble clic o "Finalizar" para confirmar.`;
  else if (selectedTextId)
    hintText = 'Texto seleccionado — ajusta su contenido o color en el panel lateral. (Presiona Supr para eliminar)';
  else if (selectedPointId)
    hintText = 'Punto seleccionado — configura su radio o color en el panel lateral.';
  else if (selectedLineId)
    hintText = 'Línea seleccionada — arrastra los vértices (●) para moverlos individualmente.';

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        padding: '12px 24px 16px',
        gap: 8,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          border: '1px solid rgba(100,116,139,0.4)',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: draggingVertex ? 'grabbing' : 'crosshair', display: 'block', touchAction: 'none', userSelect: 'none' }}
        />

        {strikeMode && (
          <StrikePanel
            spin={spin}
            setSpin={setSpin}
            strike={strike}
            setStrike={setStrike}
            clothColor={clothColor}
            onClose={() => setStrikeMode(false)}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: dimensions.width, maxWidth: '100%', padding: '0 4px', fontSize: 11.5, color: '#64748b' }}>
        <span>💡 {hintText}</span>
        <span>
          Herramienta: <strong style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{activeTool}</strong>
        </span>
      </div>
    </div>
  );
}
