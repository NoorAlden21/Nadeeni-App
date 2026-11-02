import QRCode from "qrcode";

const draw = {
  margin: 1,
  color: { dark: "#4a0418", light: "#fffdf8" },
};

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
