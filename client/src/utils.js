export function initials(name) {
  return (
    String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?'
  );
}

export function historyTitle(check, fallback = 'Symptom check') {
  const firstLine = check.symptoms?.split('\n')[0]?.trim();
  if (firstLine) return firstLine.length > 82 ? `${firstLine.slice(0, 79)}…` : firstLine;
  return check.tags?.length ? check.tags.join(', ') : fallback;
}

export function formatCheckDate(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
