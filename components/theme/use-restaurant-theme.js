"use client";

import { useEffect, useMemo } from "react";
import { normalizeHex, themeStyle } from "@/lib/theme/restaurant-theme";

export function useRestaurantTheme(restaurant) {
  const primary = normalizeHex(restaurant?.primary_color);
  const secondary = normalizeHex(restaurant?.secondary_color);
  const style = useMemo(
    () => themeStyle({ primary_color: primary, secondary_color: secondary }),
    [primary, secondary],
  );

  useEffect(() => {
    if (!style) return undefined;
    const root = document.documentElement;
    const entries = Object.entries(style);
    for (const [key, value] of entries) {
      root.style.setProperty(key, value);
    }

    const selection = document.createElement("style");
    const background = style["--restaurant-primary"] || "#7e062a";
    const color = style["--restaurant-on-primary"] || "#fdfaf1";
    selection.textContent = `::selection{background:${background};color:${color}}`;
    document.head.appendChild(selection);

    return () => {
      for (const [key] of entries) {
        root.style.removeProperty(key);
      }
      selection.remove();
    };
  }, [style]);

  return style;
}
