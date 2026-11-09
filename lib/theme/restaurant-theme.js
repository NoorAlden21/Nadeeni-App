const storagePrefix = "nadeeni.theme.";

export const themeDefaults = {
  ivory: "#fdfaf1",
  ink: "#2a1016",
};

const hexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!hexPattern.test(text)) return null;
  const body = text.slice(1).toLowerCase();
  if (body.length === 3) {
    return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
  }
  return `#${body}`;
}

function channel(hex, index) {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

function rgb(hex) {
  return [channel(hex, 0), channel(hex, 1), channel(hex, 2)];
}

function toHex(red, green, blue) {
  const part = (value) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(red)}${part(green)}${part(blue)}`;
}

function mix(base, target, amount) {
  const [baseRed, baseGreen, baseBlue] = rgb(base);
  const [targetRed, targetGreen, targetBlue] = rgb(target);
  return toHex(
    baseRed + (targetRed - baseRed) * amount,
    baseGreen + (targetGreen - baseGreen) * amount,
    baseBlue + (targetBlue - baseBlue) * amount,
  );
}

function linear(value) {
  const channelValue = value / 255;
  return channelValue <= 0.04045 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [red, green, blue] = rgb(hex);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrast(first, second) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableOn(color) {
  const onIvory = contrast(color, themeDefaults.ivory);
  const onInk = contrast(color, themeDefaults.ink);
  return onIvory >= onInk ? themeDefaults.ivory : themeDefaults.ink;
}

function accentDeep(color) {
  const amount = contrast(color, themeDefaults.ivory) >= 4.5 ? 0.2 : 0.48;
  return mix(color, "#000000", amount);
}

export function restaurantTitle(restaurant, lang) {
  const arabic = typeof restaurant?.name === "string" ? restaurant.name.trim() : "";
  const english = typeof restaurant?.name_en === "string" ? restaurant.name_en.trim() : "";
  if (lang === "en" && english) return english;
  return arabic;
}

export function restaurantTheme(source) {
  const primary = normalizeHex(source?.primary_color);
  const secondary = normalizeHex(source?.secondary_color);
  const theme = {
    active: Boolean(primary || secondary),
    secondaryRole: "default",
  };

  if (primary) {
    theme.primary = primary;
    theme.primaryDeep = mix(primary, "#000000", 0.38);
    theme.onPrimary = readableOn(primary);
    theme.foam = mix(themeDefaults.ivory, primary, 0.14);
  }

  if (secondary && contrast(secondary, themeDefaults.ivory) >= 3) {
    theme.secondaryRole = "accent";
    theme.secondary = secondary;
    theme.secondaryDeep = accentDeep(secondary);
    theme.onSecondary = readableOn(secondary);
  } else if (secondary) {
    theme.secondaryRole = "wash";
    theme.wash = secondary;
    theme.photo = secondary;
    theme.soft = mix(secondary, "#ffffff", 0.45);
  }

  return theme;
}

export function themeStyle(source) {
  const theme = restaurantTheme(source);
  if (!theme.active) return undefined;

  const style = {};
  if (theme.primary) {
    style["--restaurant-primary"] = theme.primary;
    style["--restaurant-primary-deep"] = theme.primaryDeep;
    style["--restaurant-on-primary"] = theme.onPrimary;
    style["--restaurant-foam"] = theme.foam;
  }
  if (theme.secondaryRole === "accent") {
    style["--restaurant-secondary"] = theme.secondary;
    style["--restaurant-secondary-deep"] = theme.secondaryDeep;
    style["--restaurant-on-secondary"] = theme.onSecondary;
    style["--choice-line"] = theme.secondary;
  } else if (theme.primary) {
    style["--choice-line"] = mix(themeDefaults.ivory, theme.primary, 0.55);
  }
  if (theme.secondaryRole === "wash") {
    style["--restaurant-wash"] = theme.wash;
    style["--restaurant-photo"] = theme.photo;
    style["--restaurant-soft"] = theme.soft;
    style["--choice-canvas"] = theme.wash;
  } else if (theme.foam) {
    style["--choice-canvas"] = theme.foam;
  }
  return style;
}

export function colorValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return { error: "", value: null };
  const hex = normalizeHex(text);
  if (!hex) return { error: "اللون يُكتب #rgb أو #rrggbb.", value: null };
  return { error: "", value: hex };
}

export function themeFieldChanges(current, next) {
  const body = {};
  const nameEn = String(next?.name_en ?? "").trim();
  if (nameEn.length > 255) {
    return { error: "الاسم الإنجليزي 255 حرفاً كحد أقصى.", body: null };
  }

  const previousName = typeof current?.name_en === "string" ? current.name_en.trim() : "";
  if (!current) {
    if (nameEn) body.name_en = nameEn;
  } else if (nameEn !== previousName) {
    body.name_en = nameEn || null;
  }

  for (const key of ["primary_color", "secondary_color"]) {
    const parsed = colorValue(next?.[key]);
    if (parsed.error) return { error: parsed.error, body: null };
    if (!current) {
      if (parsed.value) body[key] = parsed.value;
      continue;
    }
    if (parsed.value !== normalizeHex(current[key])) body[key] = parsed.value;
  }

  return { error: "", body };
}

export function rememberRestaurantTheme(restaurant) {
  if (typeof window === "undefined" || !restaurant) return;
  const payload = JSON.stringify({
    primary_color: normalizeHex(restaurant.primary_color),
    secondary_color: normalizeHex(restaurant.secondary_color),
  });
  const names = [restaurant.name, restaurant.name_en].filter((item) => typeof item === "string" && item.trim());
  try {
    for (const name of names) {
      window.localStorage.setItem(storagePrefix + name.trim(), payload);
    }
  } catch {
    // This visit still uses the colors from the restaurant response.
  }
}

export function readStoredTheme(name) {
  if (typeof window === "undefined" || typeof name !== "string" || !name.trim()) return null;
  try {
    const raw = window.localStorage.getItem(storagePrefix + name.trim());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      primary_color: normalizeHex(parsed.primary_color),
      secondary_color: normalizeHex(parsed.secondary_color),
    };
  } catch {
    return null;
  }
}
