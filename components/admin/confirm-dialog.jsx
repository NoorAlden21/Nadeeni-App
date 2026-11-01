"use client";

import { useEffect, useRef } from "react";
import { ActionButton } from "@/components/cashier/action-button";

export function ConfirmDialog({ open, title, body, confirmLabel, pending, onConfirm, onDismiss, titleId }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdrop(event) {
    if (event.target === dialogRef.current && !pending) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onDismiss}
      onCancel={(event) => {
        if (pending) {
          event.preventDefault();
        }
      }}
      onClick={handleBackdrop}
      className="m-auto h-fit w-[min(24rem,calc(100%-2rem))] rounded-[1.6rem] border-0 bg-paper p-5 text-ink shadow-[0_24px_60px_-28px_rgba(74,4,24,0.55)] backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="font-display text-2xl font-semibold text-burgundy-deep">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-ink/70">{body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-start gap-2">
        <button
          type="button"
          autoFocus
          disabled={pending}
          onClick={() => dialogRef.current?.close()}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-4 text-sm font-medium text-ink/55 underline-offset-4 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40"
        >
          تراجع
        </button>
        <ActionButton onClick={onConfirm} disabled={pending} className="min-w-28">
          {confirmLabel}
        </ActionButton>
      </div>
    </dialog>
  );
}
