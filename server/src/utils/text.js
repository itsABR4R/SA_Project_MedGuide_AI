export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function cleanMultiline(value, maxLength = 4000) {
  return String(value || '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, maxLength);
}

export function normalizeStringArray(value, maxItems, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean);
}
