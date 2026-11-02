import QRCode from "qrcode";

const publicAppOrigin = "https://nadeeni-app.vercel.app";

const draw = {
  margin: 1,
  color: { dark: "#4a0418", light: "#fffdf8" },
};

export function qrTargetUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const target = new URL(publicAppOrigin);
      parsed.protocol = target.protocol;
      parsed.hostname = target.hostname;
      parsed.port = "";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function qrCanvasOptions(width) {
  return { ...draw, width };
}

export function qrFileName(orderNumber) {
  if (!orderNumber) {
    return "رمز-المطعم.png";
  }

  const safe = String(orderNumber).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim();
  return safe ? `رمز-${safe}.png` : "رمز-الطلب.png";
}

export async function downloadQrImage(url, filename) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, { ...draw, margin: 2, width: 1024 });

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("qr_blob");
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
