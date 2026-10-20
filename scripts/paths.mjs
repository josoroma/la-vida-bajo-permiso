import path from 'node:path';

// A project site is mounted at /repository; local development uses the root.
export function normalizeBasePath(value = '') {
  if (value === '' || value === '/') return '';
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\/?$/.test(value)) {
    throw new Error('BASE_PATH debe ser una ruta como /la-vida-bajo-permiso, sin dominio, consulta ni fragmento.');
  }
  const normalized = value.replace(/\/$/, '');
  if (normalized.split('/').some(segment => segment === '.' || segment === '..')) {
    throw new Error('BASE_PATH no permite segmentos . ni ..');
  }
  return normalized;
}

export function outputDirectory(root, value = 'publicacion') {
  const output = path.resolve(root, value || 'publicacion');
  if (output === root || root.startsWith(output + path.sep)) {
    throw new Error('OUTPUT_DIR debe apuntar a una carpeta de salida, no al proyecto ni a uno de sus directorios superiores.');
  }
  return output;
}

export function mountHtmlUrls(html, basePath) {
  return html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_, attribute, url) => `${attribute}="${basePath}${url}"`);
}
