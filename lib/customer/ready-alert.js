let audioContext = null;
let chimeBuffer = null;
let chimeRequest = null;

function loadChime(context) {
  if (chimeBuffer) {
    return Promise.resolve(chimeBuffer);
  }
  if (!chimeRequest) {
    chimeRequest = fetch("/myChime.m4a")
      .then((response) => {
        if (!response.ok) {
          throw new Error("chime");
        }
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        chimeBuffer = buffer;
        return buffer;
      })
      .catch((error) => {
        chimeRequest = null;
        throw error;
      });
  }
  return chimeRequest;
}

function playToneFallback() {
  const now = audioContext.currentTime;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const start = now + index * 0.14;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.46);
  });
}

export async function primeReadyAlert() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return false;
  }

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      return false;
    }
  }

  if (audioContext.state !== "running") {
    return false;
  }

  try {
    await loadChime(audioContext);
  } catch {
    // The recorded clip can fail to decode. The tone fallback still plays.
  }

  return true;
}

export function playReadyAlert() {
  if (!audioContext || audioContext.state !== "running") {
    return false;
  }

  try {
    if (chimeBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = chimeBuffer;
      source.connect(audioContext.destination);
      source.start();
    } else {
      playToneFallback();
    }
  } catch {
    return false;
  }

  if (typeof navigator.vibrate === "function") {
    navigator.vibrate([180, 90, 180, 90, 320]);
  }

  return true;
}
