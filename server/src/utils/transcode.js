const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Transcode a base64 data-URI video to a universally-playable H.264 MP4 (AAC audio).
// Returns the new data URI, or the original input if transcoding is unavailable or fails,
// so uploads never break just because ffmpeg is missing.
function transcodeVideo(dataUri) {
  return new Promise((resolve) => {
    if (!dataUri || typeof dataUri !== 'string') return resolve(dataUri || '');
    const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
    if (!m) return resolve(dataUri); // not a data URI — pass through

    let buffer;
    try { buffer = Buffer.from(m[2], 'base64'); } catch { return resolve(dataUri); }
    if (!buffer.length) return resolve(dataUri);

    const id = crypto.randomBytes(8).toString('hex');
    const tmpIn = path.join(os.tmpdir(), `vidin_${id}`);
    const tmpOut = path.join(os.tmpdir(), `vidout_${id}.mp4`);

    try { fs.writeFileSync(tmpIn, buffer); } catch { return resolve(dataUri); }

    const args = [
      '-y', '-i', tmpIn,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '64k',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-movflags', '+faststart',
      tmpOut,
    ];

    execFile('ffmpeg', args, { timeout: 90000, maxBuffer: 16 * 1024 * 1024 }, (err) => {
      const cleanup = () => { try { fs.unlinkSync(tmpIn); } catch {} try { fs.unlinkSync(tmpOut); } catch {} };
      if (err) { cleanup(); return resolve(dataUri); }
      try {
        const out = fs.readFileSync(tmpOut);
        cleanup();
        if (!out.length) return resolve(dataUri);
        return resolve('data:video/mp4;base64,' + out.toString('base64'));
      } catch { cleanup(); return resolve(dataUri); }
    });
  });
}

module.exports = { transcodeVideo };
