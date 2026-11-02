"use client";

import { useEffect, useRef } from "react";
import { ActionButton } from "@/components/cashier/action-button";

export function UncollectDialog({ order, pending = false, onConfirm, onDismiss }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (order && !dialog.open) {
      dialog.showModal();
    } else if (!order && dialog.open) {
      dialog.close();
    }
  }, [order]);

  function handleBackdrop(event) {
    if (event.target === dialogRef.current) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="uncollect-order-title"
      aria-describedby="uncollect-order-description"
      onClose={onDismiss}
      onClick={handleBackdrop}
      className="m-auto h-fit w-[min(24rem,calc(100%-2rem))] rounded-[1.6rem] border-0 bg-paper p-5 text-ink shadow-[0_24px_60px_-28px_rgba(74,4,24,0.55)] backdrop:bg-ink/40"
    >
      {order ? (
        <>
          <h2
            id="uncollect-order-title"
            className="font-display text-2xl font-semibold text-burgundy-deep"
          >
            لم يُستلم الطلب
          </h2>
          <p id="uncollect-order-description" className="mt-2 text-sm leading-7 text-ink/70">
            الزبون لم يأخذ هذا الطلب الجاهز. الرقم يعود متاحاً لطلب جديد.
          </p>
          <p
            dir="ltr"
            translate="no"
            className="mt-1 text-end font-sans text-3xl font-semibold text-burgundy-deep"
          >
            {order.order_number}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-start gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-4 text-sm font-medium text-ink/55 underline-offset-4 transition duration-300 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              تراجع
            </button>
            <ActionButton
              onClick={onConfirm}
              disabled={pending}
              aria-label={`تسجيل أن الفاتورة ${order.order_number} لم تُستلم`}
              className="min-w-36"
            >
              لم يُستلم
            </ActionButton>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
