"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrDialog({ qr, onDismiss }) {
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    if (qr && !dialog.open) {
      dialog.showModal();
    } else if (!qr && dialog.open) {
      dialog.close();
    }

    const canvas = canvasRef.current;
    if (!canvas || !qr?.url) {
      return undefined;
    }

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      QRCode.toCanvas(canvas, qr.url, {
        margin: 1,
        width: 220,
        color: { dark: "#4a0418", light: "#fffdf8" },
      }).catch(() => {
        if (!cancelled) {
          canvas.replaceChildren();
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [qr]);

  function handleBackdrop(event) {
    if (event.target === dialogRef.current) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cashier-qr-title"
      onClose={onDismiss}
      onClick={handleBackdrop}
      className="m-auto h-fit w-[min(24rem,calc(100%-2rem))] rounded-[1.6rem] border-0 bg-paper p-5 text-ink shadow-[0_24px_60px_-28px_rgba(74,4,24,0.55)] backdrop:bg-ink/40"
    >
      {qr ? (
        <div className="flex flex-col items-center text-center">
          <h2
            id="cashier-qr-title"
            className="font-display text-2xl font-semibold text-burgundy-deep"
          >
            {qr.title}
          </h2>
          {qr.orderNumber ? (
            <p
              dir="ltr"
              translate="no"
              className="mt-1 font-sans text-3xl font-semibold text-burgundy-deep"
            >
              {qr.orderNumber}
            </p>
          ) : null}
          <canvas ref={canvasRef} className="mt-4 rounded-2xl" />
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-4 text-sm font-medium text-ink/55 underline-offset-4 transition duration-300 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            إغلاق
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
