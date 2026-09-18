// Normalize presentation only: saved responses and user-entered text stay intact.
export function cleanAiText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*(?:`{3,}|~{3,})[^\n]*$/gm, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm, '$1')
    .replace(/^[ \t]*(?:\*[ \t]*){3,}$|^[ \t]*(?:-[ \t]*){3,}$/gm, '')
    .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1• ')
    .replace(/(?<![\p{L}\p{N}])\*{2,}|\*{2,}(?![\p{L}\p{N}])/gu, '')
    .replace(/__([^\n]+?)__/g, '$1')
    .replace(/(^|[\s(])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?=$|[\s.,!?;:)])/g, '$1$2')
    .replace(/(^|[\s(])_([^\s_](?:[^_\n]*[^\s_])?)_(?=$|[\s.,!?;:)])/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
