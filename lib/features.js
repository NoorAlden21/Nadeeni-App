export function readFeatures(record) {
  const source =
    record?.features && typeof record.features === "object" ? record.features : record;

  return {
    pager: source?.pager === true,
    menu: source?.menu === true,
    ordering: source?.ordering === true,
    kitchen: source?.kitchen === true,
    loyalty: source?.loyalty === true,
  };
}

export function featureSummary(record) {
  const hasFeatures = record?.features && typeof record.features === "object";
  const hasPlanFlags =
    record?.pager !== undefined || record?.menu !== undefined || record?.loyalty !== undefined;
  if (!hasFeatures && !hasPlanFlags) {
    return "";
  }

  const features = readFeatures(record);
  const parts = [];
  if (features.pager) parts.push("مناداة");
  if (features.menu) parts.push("قائمة");
  if (features.loyalty) parts.push("ولاء");
  return parts.length ? parts.join(" · ") : "بدون مناداة أو قائمة";
}

export function isFeatureUnavailable(error) {
  return error?.status === 403 && error?.body?.message === "feature_unavailable";
}
