import { publicContactLinks } from "@/lib/contact";

const iconOrder = ["instagram", "facebook", "phone"];

export function RestaurantContact({ contact, icons = false, className = "" }) {
  const links = publicContactLinks(contact);
  if (links.length === 0) {
    return null;
  }

  if (icons) {
    const ordered = iconOrder
      .map((kind) => links.find((link) => link.kind === kind))
      .filter(Boolean);

    return (
      <div className={`ms-auto shrink-0 ${className}`}>
        <div dir="ltr" className="flex items-center gap-2.5">
          {ordered.map((link) => (
            <ContactIcon key={link.kind} link={link} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-4 flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((link) => (
        <ContactLink key={link.kind} link={link} />
      ))}
    </div>
  );
}

function ContactIcon({ link }) {
  const external = link.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const label = link.kind === "phone" ? `اتصال ${link.label}` : link.label;

  return (
    <a
      href={link.href}
      {...external}
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-lg transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:size-9"
    >
      {link.kind === "facebook" ? <FacebookIcon /> : null}
      {link.kind === "instagram" ? <InstagramIcon /> : null}
      {link.kind === "phone" ? <PhoneIcon /> : null}
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 sm:size-8" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 sm:size-8" aria-hidden="true">
      <defs>
        <linearGradient id="nadeeni-instagram" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f9ce34" />
          <stop offset="0.5" stopColor="#ee2a7b" />
          <stop offset="1" stopColor="#6228d7" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#nadeeni-instagram)" />
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="17.15" cy="6.85" r="1.05" fill="#fff" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 sm:size-8" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#4a0418" />
      <path
        fill="#fff"
        d="M16.7 14.55c-.22-.22-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.14.22-.57.71-.7.86-.13.14-.26.16-.48.05-.22-.11-.93-.34-1.77-1.09-.65-.58-1.1-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.14-.22.22-.37.07-.14.04-.27-.02-.39-.05-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.43c-.14 0-.39.05-.59.27-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.14 1.57 2.4 3.81 3.36.53.23.95.37 1.27.47.53.17 1.02.14 1.4.09.43-.07 1.3-.53 1.48-1.04.18-.52.18-.96.13-1.05-.05-.1-.2-.16-.42-.27z"
      />
    </svg>
  );
}

function ContactLink({ link }) {
  const external = link.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <a
      href={link.href}
      dir={link.kind === "phone" ? "ltr" : undefined}
      {...external}
      aria-label={link.kind === "phone" ? `اتصال ${link.label}` : undefined}
      className={`inline-flex h-10 items-center rounded-full bg-white px-3 text-sm font-semibold text-burgundy-deep ring-1 ring-burgundy/10 transition hover:bg-foam ${
        link.kind === "phone" ? "font-sans" : ""
      }`}
    >
      {link.label}
    </a>
  );
}
