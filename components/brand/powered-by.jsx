import { BrandMark } from "@/components/brand/brand-mark";

export function PoweredBy({ className = "" }) {
  return (
    <div className={`mt-8 flex justify-center ${className}`}>
      <div className="inline-flex items-center gap-2 rounded-full bg-ivory/95 px-3 py-1 text-ink/70 ring-1 ring-burgundy/10">
        <p className="text-xs font-semibold">مدعوم بواسطة منصة </p>
        <BrandMark className="h-8 w-8" />
      </div>
    </div>
  );
}
