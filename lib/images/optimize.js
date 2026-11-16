const PRODUCTION_HOST = "nadeeni-api.onrender.com";

function isPrivateHost(hostname) {
  const host = String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0" || host.endsWith(".local")) {
    return true;
  }
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return true;
  }
  return false;
}

function publicApiPattern() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "";
  if (!/^https?:\/\//.test(raw)) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (isPrivateHost(url.hostname) || url.hostname === PRODUCTION_HOST) {
      return null;
    }
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/api/public/restaurants/**",
    };
  } catch {
    return null;
  }
}

export function imageRemotePatterns() {
  const patterns = [
    {
      protocol: "https",
      hostname: PRODUCTION_HOST,
      pathname: "/api/public/restaurants/**",
    },
  ];
  const extra = publicApiPattern();
  if (extra) {
    patterns.push(extra);
  }
  return patterns;
}

function matchesPattern(url, pattern) {
  if (`${pattern.protocol}:` !== url.protocol) return false;
  if (pattern.hostname !== url.hostname) return false;
  if ((pattern.port || "") !== url.port) return false;
  return url.pathname.startsWith("/api/public/restaurants/");
}

export function shouldOptimize(src) {
  if (!src || typeof src !== "string") return false;
  if (src.startsWith("blob:") || src.startsWith("data:")) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  let url;
  try {
    url = new URL(src);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (isPrivateHost(url.hostname)) return false;
  // Category and restaurant icons may be SVG. The optimizer rejects SVG, so those stay original files.
  if (url.pathname.endsWith("/icon")) return false;
  return imageRemotePatterns().some((pattern) => matchesPattern(url, pattern));
}
