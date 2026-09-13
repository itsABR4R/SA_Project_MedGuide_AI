import { normalizeLanguage } from './language.js';

export function checkContext(check, language) {
  if (!check) return '';
  const bangla = normalizeLanguage(language) === 'bn';
  const query = check.symptoms?.trim() || check.tags?.join(', ') || '';
  return [
    `${bangla ? 'আপনার বিবরণ' : 'Your query'}: ${query}`,
    `${bangla ? 'নির্দেশনার সারাংশ' : 'Guidance summary'}: ${check.analysis?.summary || ''}`
  ].join('\n\n');
}

export function legacyCheckMatch(conversation, checks) {
  // Older releases stored context text but no foreign key. Link only an exact,
  // unique query + guidance match; a similar symptom or nearby date is not enough.
  const parts = String(conversation.contextSummary || '').match(
    /^(?:Your query|আপনার বিবরণ):\s*([\s\S]*?)\n\s*\n(?:Guidance summary|নির্দেশনার সারাংশ):\s*([\s\S]*?)(?=\n\s*\n(?:Selected pattern|নির্বাচিত ধরন):|$)/i
  );
  if (!parts) return null;
  const normalize = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const createdAt = new Date(conversation.createdAt).getTime();
  const matches = checks.filter(
    (check) =>
      new Date(check.createdAt).getTime() <= createdAt &&
      normalize(check.symptoms?.trim() || check.tags?.join(', ')) === normalize(parts[1]) &&
      normalize(check.analysis?.summary) === normalize(parts[2])
  );
  return matches.length === 1 ? matches[0].id : null;
}
