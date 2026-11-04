"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog({ ...props }) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal({ ...props }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-burgundy-deep/50", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, closeLabel = "Close", sheet = false, page = false, hideClose = false, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 w-full bg-paper text-ink shadow-[0_30px_60px_-28px_rgba(74,4,24,0.55)] outline-none",
          page
            ? "inset-0 flex h-dvh max-w-none flex-col overflow-y-auto rounded-none bg-white sm:inset-y-0 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
            : sheet
              ? "inset-x-0 bottom-0 grid max-h-[92dvh] overflow-y-auto rounded-t-[1.6rem] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(28rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem]"
              : "top-1/2 left-1/2 grid w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem]",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-3 end-3 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-ivory/95 text-burgundy shadow-sm ring-1 ring-burgundy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center", className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-3xl leading-10 font-bold text-burgundy-deep", className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-base leading-8 text-ink/70", className)} {...props} />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle };
