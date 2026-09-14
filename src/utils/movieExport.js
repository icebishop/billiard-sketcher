/* ═══════════════════════════════════════════════════════════════
   movieExport — turns an ordered list of captured frames (each a PNG
   data URL with an exposure time in seconds) into a downloadable
   WebM video using an offscreen canvas + MediaRecorder.

   Falls back to downloading the raw frames as PNGs if the browser
   does not support canvas.captureStream / MediaRecorder.
═══════════════════════════════════════════════════════════════ */

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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Render each frame for its exposure time and record to WebM.
 * @param {Array<{dataUrl:string, seconds:number, width:number, height:number}>} frames
 */
export async function exportMovieWebM(frames) {
  if (!frames || frames.length === 0) return;

  const mimeType   = pickMimeType();
  const canStream  = typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function'
    && mimeType;

  // Load every frame image up front.
  const images = await Promise.all(frames.map(f => loadImage(f.dataUrl)));

  const width  = frames[0].width  || images[0].naturalWidth;
  const height = frames[0].height || images[0].naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Draw the first frame immediately so the stream has content.
  ctx.drawImage(images[0], 0, 0, width, height);

  if (!canStream) {
    // Fallback: download each frame as a numbered PNG.
    frames.forEach((f, i) => {
      const link = document.createElement('a');
      link.href     = f.dataUrl;
      link.download = `billiard-movie-frame-${String(i + 1).padStart(2, '0')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    return;
  }

  const fps    = 30;
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      triggerDownload(blob, `billiard-movie-${Date.now()}.webm`);
      resolve();
    };
  });

  recorder.start();

  // Play the frames sequentially, holding each for its exposure time.
  for (let i = 0; i < images.length; i++) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(images[i], 0, 0, width, height);
    const holdMs = Math.max(100, (Number(frames[i].seconds) || 1) * 1000);
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, holdMs));
  }

  recorder.stop();
  await done;
}
