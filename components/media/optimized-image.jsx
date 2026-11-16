"use client";

import { useState } from "react";
import Image from "next/image";
import { shouldOptimize } from "@/lib/images/optimize";

// Flat stand-in while a hero photo streams in. Remote files have no blur hash from the API.
const unpacked = new Set();

const warmBlur =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48uICVsQwtCQA2aarAUFYoykAAAAASUVORK5CYII=";

function framed(className) {
  if (className.includes("object-contain") || className.includes("object-cover")) {
    return className;
  }
  return `object-cover ${className}`.trim();
}

export function OptimizedImage({
  src,
  alt = "",
  className = "",
  sizes,
  priority = false,
  eager = false,
  quality = 60,
  fill = false,
  width,
  height,
  blur = false,
  onError,
}) {
  const [directSrc, setDirectSrc] = useState("");
  const frame = framed(className);

  if (!src) {
    return null;
  }

  // A local API, an SVG icon, or a failed optimizer still shows the original file.
  if (directSrc === src || unpacked.has(src) || !shouldOptimize(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority || eager ? "eager" : "lazy"}
        decoding="async"
        onError={onError}
        className={`${fill ? "absolute inset-0 size-full" : ""} ${frame}`.trim()}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      sizes={sizes || (fill ? "100vw" : `${width || 64}px`)}
      priority={priority}
      {...(priority ? {} : { loading: eager ? "eager" : "lazy" })}
      quality={quality}
      {...(blur ? { placeholder: "blur", blurDataURL: warmBlur } : {})}
      onError={() => {
        unpacked.add(src);
        setDirectSrc(src);
      }}
      className={frame}
    />
  );
}
