const CDN = 'https://cdn.jsdelivr.net/gh/henry-debruin/nso-icons@main';

export type PartKind = 'frames' | 'characters' | 'backgrounds';

export function partUrl(slug: string, kind: PartKind, file: string): string {
  return `${CDN}/${encodeURI(slug)}/${kind}/${encodeURI(file)}`;
}
