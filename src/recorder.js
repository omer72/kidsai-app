let mediaRecorder = null;
let chunks = [];
let stream = null;

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone not available on this device.');
  }
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  chunks = [];
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  mediaRecorder.start();
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return resolve(null);
    const rec = mediaRecorder;
    const st = stream;
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      st?.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      stream = null;
      chunks = [];
      resolve(blob);
    };
    rec.onerror = (e) => {
      st?.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      stream = null;
      chunks = [];
      reject(e.error || new Error('Recording error'));
    };
    try { rec.stop(); } catch (e) { reject(e); }
  });
}

export function cancelRecording() {
  if (!mediaRecorder) return;
  try { mediaRecorder.stop(); } catch {}
  stream?.getTracks().forEach((t) => t.stop());
  mediaRecorder = null;
  stream = null;
  chunks = [];
}
