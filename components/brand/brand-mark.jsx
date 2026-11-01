export function BrandMark({ className = "h-14 w-14" }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      {/* Physical crop. left/top stay physical so RTL does not slide the wordmark. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Nadeeni Logo"
        className="absolute max-w-none"
        style={{ width: "297%", height: "auto", left: "-108%", top: "-219%" }}
      />
    </span>
  );
}
