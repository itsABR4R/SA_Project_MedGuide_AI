export function responseLanguage(text, fallback = 'en') {
  // Saved replies can be in a different language from the current interface.
  if (/[\u0980-\u09ff]/u.test(text)) return 'bn';
  if (/[a-z]/i.test(text)) return 'en';
  return fallback === 'bn' ? 'bn' : 'en';
}

export function selectSpeechVoice(voices, language) {
  const normalize = (tag) =>
    String(tag || '')
      .toLowerCase()
      .replaceAll('_', '-');
  const matching = voices.filter((voice) => normalize(voice.lang).split('-')[0] === language);
  const preferred = language === 'bn' ? ['bn-bd', 'bn-in'] : ['en-us', 'en-gb'];
  for (const locale of preferred) {
    const voice = matching.find((candidate) => normalize(candidate.lang) === locale);
    if (voice) return voice;
  }
  return matching.find((voice) => voice.default) || matching[0] || null;
}
