/**
 * Utility function to safely download a blob and clean up the object URL
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Clean up object URL after a delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Extract filename from content-disposition header
 * Supports quoted, unquoted, and RFC 5987 encoded filenames
 */
export function extractFilename(contentDisposition: string | null, defaultName: string): string {
  if (!contentDisposition) return defaultName;
  
  // Handle quoted filenames: filename="example.txt"
  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/);
  if (quotedMatch && quotedMatch[1]) return quotedMatch[1];
  
  // Handle unquoted filenames: filename=example.txt
  const unquotedMatch = contentDisposition.match(/filename=([^;]+)/);
  if (unquotedMatch && unquotedMatch[1]) {
    const filename = unquotedMatch[1].trim();
    return filename.startsWith('"') && filename.endsWith('"') 
      ? filename.slice(1, -1) 
      : filename;
  }
  
  // Try filename* with encoding (RFC 5987): filename*=UTF-8''example.txt
  const encodedMatch = contentDisposition.match(/filename\*=([^']+)'[^']*'(.+)/);
  if (encodedMatch && encodedMatch[2]) {
    try {
      return decodeURIComponent(encodedMatch[2]);
    } catch {
      // Fallback to default if decoding fails
    }
  }
  
  return defaultName;
}
