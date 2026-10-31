import type { Item } from '../stores/data';
export function photoExtension(item: Item) {
  const path = item.data.fileName || item.data.path || '';
  const extension = path.match(/\.(jpe?g|png|webp)$/i)?.[1];
  if (extension) return extension.toLowerCase();
  if (item.data.mimeType === 'image/png' || String(item.data.localUrl).startsWith('data:image/png')) return 'png';
  if (item.data.mimeType === 'image/webp' || String(item.data.localUrl).startsWith('data:image/webp')) return 'webp';
  return 'jpg';
}
export function photoFileName(item: Item) { return item.data.fileName || `${item.title}.${photoExtension(item)}`; }
export function renamedPhoto(item: Item, input: string, notes: string, album: string): Item {
  const name = input.trim();
  if (!name || /[\\/\u0000-\u001f]/.test(name)) throw Error('Choose a file name without slashes or control characters.');
  const stem = name.replace(/\.(jpe?g|png|webp)$/i, '').trim();
  if (!stem || stem.length > 180) throw Error('Choose a file name between 1 and 180 characters.');
  const extension = photoExtension(item);
  return { ...item, title: stem, body: notes.trim(), category: album, data: { ...item.data, fileName: `${stem}.${extension}` } };
}
