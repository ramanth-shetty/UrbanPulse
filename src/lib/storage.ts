import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload an image file attached to a citizen complaint report.
 * Stored at path: /reports/{reportId}_{filename}
 * Returns the public download URL.
 */
export async function uploadReportPhoto(
  file: File,
  reportId: string = `rpt_${Date.now()}`,
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanName = `${reportId}_${Date.now()}.${fileExt}`;
  const storageRef = ref(storage, `reports/${cleanName}`);

  // Upload raw bytes with appropriate content-type metadata
  const metadata = {
    contentType: file.type || 'image/jpeg',
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

