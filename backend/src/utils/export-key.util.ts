export const PDF_RENDER_VERSION = "v2";

export function getPdfExportKey(uploadId: string, analysisId: string): string {
  return `exports/${PDF_RENDER_VERSION}/${uploadId}/${analysisId}.pdf`;
}

export function getPdfExportPrefixes(uploadId: string): string[] {
  return [
    `exports/${uploadId}/`,
    `exports/${PDF_RENDER_VERSION}/${uploadId}/`,
  ];
}
