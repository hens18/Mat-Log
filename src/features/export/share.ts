// Native sharing: write to the cache directory, then open the share sheet.
// The web version lives in share.web.ts.

import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function ensureSharing() {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
}

export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  await ensureSharing();
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: fileName });
}

export async function sharePdf(html: string, fileName: string): Promise<void> {
  await ensureSharing();
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: fileName,
  });
}

/** Shares an image captured with react-native-view-shot (a tmpfile URI). */
export async function shareImage(uri: string): Promise<void> {
  await ensureSharing();
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}

/** What react-native-view-shot should return on this platform. */
export const CAPTURE_RESULT = 'tmpfile' as const;
