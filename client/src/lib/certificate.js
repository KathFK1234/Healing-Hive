// What a certificate upload may be. The server checks the same things (and
// the file's first bytes); checking here first saves sending 5 MB for nothing.

export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_ACCEPT = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';

const BY_EXTENSION = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const TYPES = new Set(Object.values(BY_EXTENSION));

// The type to send: the browser's own, or from the name when it gives none
export function certificateType(file) {
  if (TYPES.has(file.type)) return file.type;
  if (file.type) return null;
  return BY_EXTENSION[file.name.split('.').pop().toLowerCase()] || null;
}

// Why this file can't be sent, or null when it can
export function certificateProblem(file) {
  if (!certificateType(file)) return 'Choose a PDF, JPEG or PNG file';
  if (file.size === 0) return 'That file is empty. Choose your certificate again';
  if (file.size > CERTIFICATE_MAX_BYTES) return `That file is ${formatSize(file.size)}. Certificates can be up to 5 MB: try a smaller scan or a photo`;
  return null;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
