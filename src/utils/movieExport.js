/* ═══════════════════════════════════════════════════════════════
   movieExport — turns an ordered list of captured frames (each a PNG
   data URL with an exposure time in seconds) into a downloadable
   video using mp4-muxer (MP4) with WebCodecs, falling back to
   MediaRecorder (WebM) or raw PNG downloads.
═══════════════════════════════════════════════════════════════ */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

/** Load a data URL into an HTMLImageElement. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Pick a MediaRecorder mime type the browser actually supports. */
function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  return candidates.find(t => MediaRecorder.isTypeSupported?.(t)) ?? null;
}

function triggerDownload(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Export frames to MP4 using WebCodecs VideoEncoder + mp4-muxer.
 * Guarantees exact frame durations, high quality, and universal compatibility.
 */
async function exportWithWebCodecsMP4(frames, images, width, height) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return false;
  }

  // H.264 requires even dimensions
  const w = width % 2 === 0 ? width : width - 1;
  const h = height % 2 === 0 ? height : height - 1;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: w,
      height: h,
    },
    fastStart: 'in-memory',
  });

  let encoderError = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e;
      console.error('VideoEncoder error:', e);
    },
  });

  // Check codec support or configure
  const codec = 'avc1.42001f'; // H.264 Baseline Profile level 3.1
  const support = await VideoEncoder.isConfigSupported?.({
    codec,
    width: w,
    height: h,
    bitrate: 6_000_000,
  });

  if (support && support.supported === false) {
    return false;
  }

  videoEncoder.configure({
    codec,
    width: w,
    height: h,
    bitrate: 6_000_000,
  });

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const fps = 30;
  const deltaMicros = Math.round(1_000_000 / fps);
  let timestampMicros = 0;

  for (let i = 0; i < images.length; i++) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(images[i], 0, 0, w, h);

    const seconds = Math.max(0.1, Number(frames[i].seconds) || 1);
    const frameCount = Math.max(1, Math.round(seconds * fps));

    for (let f = 0; f < frameCount; f++) {
      if (encoderError) throw encoderError;

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: deltaMicros,
      });

      videoEncoder.encode(videoFrame, { keyFrame: i === 0 && f === 0 });
      videoFrame.close();
      timestampMicros += deltaMicros;
    }
  }

  await videoEncoder.flush();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  triggerDownload(blob, `billiard-movie-${Date.now()}.mp4`);
  return true;
}

/**
 * Fallback: Export using MediaRecorder with continuous render loop and attached canvas.
 */
async function exportWithMediaRecorderWebM(frames, images, width, height) {
  const mimeType = pickMimeType();
  const canStream = typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function'
    && mimeType;

  if (!canStream) return false;

  // Offscreen canvas attached to DOM so Chrome's compositor ticks
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '-9999px';
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(images[0], 0, 0, width, height);

  const fps = 30;
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise((resolve) => {
    recorder.onstop = () => {
      if (canvas.parentElement) document.body.removeChild(canvas);
      const blob = new Blob(chunks, { type: mimeType });
      triggerDownload(blob, `billiard-movie-${Date.now()}.webm`);
      resolve(true);
    };
  });

  recorder.start();

  // Continuously render frames to ensure continuous stream recording
  let running = true;
  let activeImage = images[0];

  const renderLoop = () => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(activeImage, 0, 0, width, height);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  for (let i = 0; i < images.length; i++) {
    activeImage = images[i];
    const holdMs = Math.max(100, (Number(frames[i].seconds) || 1) * 1000);
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, holdMs));
  }

  running = false;
  // Hold brief moment for final frame buffer
  await new Promise(r => setTimeout(r, 100));

  recorder.stop();
  return await done;
}

/**
 * Render each frame for its exposure time and save as video (MP4 / WebM).
 * @param {Array<{dataUrl:string, seconds:number, width:number, height:number}>} frames
 */
export async function exportMovieWebM(frames) {
  if (!frames || frames.length === 0) return;

  // Load every frame image up front
  const images = await Promise.all(frames.map(f => loadImage(f.dataUrl)));

  const width  = frames[0].width  || images[0].naturalWidth;
  const height = frames[0].height || images[0].naturalHeight;

  // 1. Try modern MP4 via WebCodecs + mp4-muxer (fastest, most reliable)
  try {
    const mp4Success = await exportWithWebCodecsMP4(frames, images, width, height);
    if (mp4Success) return;
  } catch (err) {
    console.warn('WebCodecs MP4 export encountered an error, trying WebM:', err);
  }

  // 2. Fallback to MediaRecorder WebM with continuous render loop
  try {
    const webmSuccess = await exportWithMediaRecorderWebM(frames, images, width, height);
    if (webmSuccess) return;
  } catch (err) {
    console.warn('MediaRecorder WebM export failed, falling back to PNGs:', err);
  }

  // 3. Last fallback: download each frame as a numbered PNG
  frames.forEach((f, i) => {
    const link = document.createElement('a');
    link.href     = f.dataUrl;
    link.download = `billiard-movie-frame-${String(i + 1).padStart(2, '0')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}
