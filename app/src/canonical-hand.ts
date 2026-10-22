import type { Inspiration } from './studio-data';

export const canonicalHand = { side: 'right' as const, skinTone: '#C78D66', photo: '/assets/canonical/french.webp' };
const presets = new Set(['silver','french','swirl','pearl','butter','cherry']);
export function inspirationPreview(source: Inspiration, showOriginal = false): string {
  return !showOriginal && source.source !== 'upload' && presets.has(source.id)
    ? `/assets/canonical/${source.id}.webp` : source.image;
}
