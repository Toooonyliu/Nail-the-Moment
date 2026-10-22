import type { MomentRecord } from './studio-data';

const credits: Record<string, { name: string; url: string }> = {
  '/assets/moments/iwaria-manicure.jpg': { name: 'Iwaria Inc. on Unsplash', url: 'https://unsplash.com/photos/a-person-getting-the-nails-painted-DzMmp0uewcg' },
  '/assets/moments/kris-atomic-manicure.jpg': { name: 'Kris Atomic on Unsplash', url: 'https://unsplash.com/photos/Xa8fX8bQCgs' },
};

export function samplePhotoCredit(moment: MomentRecord) {
  return moment.isDemo ? credits[moment.photo] ?? null : null;
}
