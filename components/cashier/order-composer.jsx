"use client";

import { ActionButton } from "@/components/cashier/action-button";

export function OrderComposer({ draft, message, busy = false, onDraftChange, onSubmit }) {
  const messageId = "order-number-message";
  const isError = message?.tone === "error";

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget.form ?? event.currentTarget;
    const added = await onSubmit();
    if (added) {
      form.elements.orderNumber.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    handleSubmit(event);
  }

  return (
    <section className="rounded-[1.6rem] bg-white/80 px-3 py-3 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.28)] ring-1 ring-burgundy/10">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="order-number" className="sr-only">
            رقم الفاتورة
          </label>
          <input
            id="order-number"
            name="orderNumber"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            dir="ltr"
            inputMode="text"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={32}
            enterKeyHint="done"
            aria-invalid={isError}
            aria-describedby={messageId}
            placeholder="رقم الفاتورة"
            className="h-12 w-full min-w-0 rounded-2xl border border-burgundy/15 bg-white px-4 text-end font-sans text-xl font-semibold text-ink outline-none transition placeholder:text-ink/25 focus:border-gold focus:ring-2 focus:ring-gold"
          />
        </div>
        <ActionButton
          type="submit"
          size="md"
          disabled={busy || !draft.trim()}
          className="h-12 shrink-0 px-4 focus-visible:ring-offset-ivory"
        >
          إضافة طلب
        </ActionButton>
      </form>
      <p
        id={messageId}
        role={isError ? "alert" : "status"}
        className={
          message?.text
            ? `mt-2 text-sm font-medium leading-6 ${isError ? "text-burgundy" : "text-gold-deep"}`
            : "sr-only"
        }
      >
        {message?.text}
      </p>
    </section>
  );
}
