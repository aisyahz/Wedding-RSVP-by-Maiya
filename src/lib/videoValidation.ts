export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-quicktime,video/mov,.mp4,.mov';

export function getSupportedVideoType(file: Pick<File, 'name' | 'type'>): 'video/mp4' | 'video/quicktime' | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith('.mp4') || type === 'video/mp4') return 'video/mp4';
  if (name.endsWith('.mov') || type === 'video/quicktime' || type === 'video/x-quicktime' || type === 'video/mov') return 'video/quicktime';
  return null;
}
