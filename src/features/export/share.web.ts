// Web sharing: browsers can't share local files, so download them instead.

import * as Print from 'expo-print';

function download(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
  _uti: string,
): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  download(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the browser's print dialog, where "Save as PDF" is an option. */
export async function sharePdf(html: string, _fileName: string): Promise<void> {
  await Print.printAsync({ html });
}

/** Downloads an image captured with react-native-view-shot (a data URI on web). */
export async function shareImage(uri: string): Promise<void> {
  download(uri, 'mat-log-season.png');
}

export const CAPTURE_RESULT = 'data-uri' as const;
