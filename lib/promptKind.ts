/**
 * Prompts ask for one thing or the other — "send a pic of your lunch" can't be
 * answered with a sentence — so Capture reads the wording and offers only the
 * matching input.
 */
export type PromptKind = 'photo' | 'text' | 'either';

const PHOTO_WORDS = /\b(pic|pics|picture|photo|photos|selfie|snap|camera|show us|show me|capture)\b/i;
const TEXT_WORDS = /\b(tell|describe|write|say|story|word|words|what are|what's|what is|how was)\b/i;

export function promptKind(prompt: string): PromptKind {
  const photo = PHOTO_WORDS.test(prompt);
  const text = TEXT_WORDS.test(prompt);
  if (photo && !text) return 'photo';
  if (text && !photo) return 'text';
  return 'either';
}
