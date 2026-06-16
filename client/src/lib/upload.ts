import imageCompression from 'browser-image-compression';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export type UploadedImage = {
  path: string;
  url: string;
  width?: number;
  height?: number;
};

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.85,
    fileType: 'image/jpeg',
    // Strips EXIF (incl. GPS) by re-encoding through canvas
  });
}

async function imageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

export async function uploadItemImage(
  uid: string,
  itemId: string,
  index: number,
  file: File,
): Promise<UploadedImage> {
  const compressed = await compressImage(file);
  const dims = await imageDimensions(compressed);
  const path = `items/${uid}/${itemId}/${index}-${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(r);
  return { path, url, ...(dims ?? {}) };
}
