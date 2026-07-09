export const defaultCellClassToEmoji = cls => cls === 'green' || cls === 'good' ? '🟩' : cls === 'yellow' || cls === 'mid' ? '🟨' : '⬛';

export function resultGridShare({ title, guessesUsed, maxGuesses, rows, cellClassToEmoji = defaultCellClassToEmoji, teaser = '' }) {
  const score = guessesUsed > maxGuesses ? 'X' : guessesUsed;
  const lines = [`${title} ${score}/${maxGuesses}`];
  rows.forEach(row => lines.push(row.map(cell => cellClassToEmoji(cell.cls ?? cell)).join('')));
  if (teaser) lines.push('', teaser);
  return lines.join('\n');
}

export async function shareOrCopy(text, { title = 'Share result' } = {}) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
