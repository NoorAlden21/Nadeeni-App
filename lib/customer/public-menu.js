function cleanText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function optionalText(value) {
  return cleanText(value) || null;
}

function readBadge(value) {
  return value === "new" || value === "offer" ? value : null;
}

function readItem(item) {
  const nameAr = cleanText(item?.name?.ar);
  if (!nameAr) {
    return null;
  }

  const price = Number(item?.price);
  return {
    name: { ar: nameAr, en: optionalText(item?.name?.en) },
    description: {
      ar: optionalText(item?.description?.ar),
      en: optionalText(item?.description?.en),
    },
    price: Number.isSafeInteger(price) && price >= 0 ? price : null,
    badge: readBadge(item?.badge),
    photoUrl: typeof item?.photo_url === "string" ? item.photo_url : "",
  };
}

export function readPublicMenu(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((category) => {
    const nameAr = cleanText(category?.name?.ar);
    if (!nameAr) {
      return [];
    }

    const items = (Array.isArray(category?.items) ? category.items : [])
      .map(readItem)
      .filter(Boolean);
    if (items.length === 0) {
      return [];
    }

    return [
      {
        name: { ar: nameAr, en: optionalText(category?.name?.en) },
        iconUrl: typeof category?.icon_url === "string" ? category.icon_url : "",
        items,
      },
    ];
  });
}
