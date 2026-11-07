const facebookHosts = ["facebook.com", "fb.com", "fb.me"];
const instagramHosts = ["instagram.com", "instagr.am"];

export const contactMessages = {
  facebook_url:
    "رابط فيسبوك 255 حرفاً كحد أقصى، ويبدأ بـ http أو https على facebook.com أو fb.com أو fb.me.",
  instagram_url:
    "رابط إنستغرام 255 حرفاً كحد أقصى، ويبدأ بـ http أو https على instagram.com أو instagr.am.",
  phone: "رقم الجوال 32 حرفاً كحد أقصى، وفيه 6 أرقام على الأقل، ويقبل أرقاماً ومسافات والرموز + ( ) . -.",
};

const contactKeys = ["facebook_url", "instagram_url", "phone"];

function readSocialUrl(value, hosts) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 255) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.username || parsed.password) {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const allowed = hosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (!allowed) {
    return null;
  }

  return text;
}

export function readFacebookUrl(value) {
  return readSocialUrl(value, facebookHosts);
}

export function readInstagramUrl(value) {
  return readSocialUrl(value, instagramHosts);
}

export function readPhone(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 32 || !/^[0-9+().\- ]+$/.test(text)) {
    return null;
  }

  const digits = text.match(/\d/g);
  if (!digits || digits.length < 6) {
    return null;
  }

  return text;
}

export function phoneHref(value) {
  const phone = readPhone(value);
  if (!phone) {
    return "";
  }

  const compact = phone.replace(/[^+0-9]/g, "");
  if (!compact || !/\d/.test(compact)) {
    return "";
  }

  return `tel:${compact}`;
}

export function contactDraft(source) {
  return {
    facebook_url: source?.facebook_url ? String(source.facebook_url) : "",
    instagram_url: source?.instagram_url ? String(source.instagram_url) : "",
    phone: source?.phone ? String(source.phone) : "",
  };
}

export function contactChanges(current, next) {
  const body = {};

  for (const key of contactKeys) {
    const previous = String(current?.[key] ?? "").trim();
    const value = String(next?.[key] ?? "").trim();
    if (value === previous) {
      continue;
    }
    if (!value) {
      body[key] = null;
      continue;
    }

    const parsed =
      key === "phone" ? readPhone(value) : key === "facebook_url" ? readFacebookUrl(value) : readInstagramUrl(value);
    if (!parsed) {
      return { error: contactMessages[key], body: null };
    }
    body[key] = parsed;
  }

  return { error: "", body };
}

export function contactErrorFromApi(errors) {
  if (!errors || typeof errors !== "object") {
    return "";
  }

  const firstKey = Object.keys(errors).find((key) => {
    const messages = errors[key];
    return Array.isArray(messages) && messages.some((item) => typeof item === "string");
  });

  if (firstKey && contactMessages[firstKey]) {
    return contactMessages[firstKey];
  }

  return "";
}

export function publicContactLinks(contact) {
  const links = [];
  const phone = readPhone(contact?.phone);
  const call = phoneHref(phone);
  if (phone && call) {
    links.push({ kind: "phone", href: call, label: phone, external: false });
  }

  const facebook = readFacebookUrl(contact?.facebook_url);
  if (facebook) {
    links.push({ kind: "facebook", href: facebook, label: "فيسبوك", external: true });
  }

  const instagram = readInstagramUrl(contact?.instagram_url);
  if (instagram) {
    links.push({ kind: "instagram", href: instagram, label: "إنستغرام", external: true });
  }

  return links;
}
