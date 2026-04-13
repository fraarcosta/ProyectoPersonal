/**
 * Almacén en memoria de ficheros de pliego por oppId.
 * Permite que el wizard de "Nueva Oportunidad" guarde los File objects
 * y el workspace los recupere para análisis sin que el usuario tenga
 * que volver a subirlos.
 *
 * No persiste entre recargas de página (esperado — los File objects
 * tampoco son serializables a localStorage).
 */

const _store = new Map<string, File[]>();

/** Guarda los ficheros para una oportunidad (reemplaza los anteriores). */
export function storeFiles(oppId: string, files: File[]): void {
  if (files.length > 0) {
    _store.set(oppId, [...files]);
  }
}

/** Añade ficheros a la lista existente de una oportunidad. */
export function addFiles(oppId: string, files: File[]): void {
  const current = _store.get(oppId) ?? [];
  const existing = new Set(current.map(f => f.name));
  const next = [...current, ...files.filter(f => !existing.has(f.name))];
  if (next.length > 0) _store.set(oppId, next);
}

/** Devuelve los ficheros almacenados para una oportunidad (o null). */
export function getFiles(oppId: string): File[] | null {
  const files = _store.get(oppId);
  return files && files.length > 0 ? files : null;
}

/** Elimina los ficheros almacenados para una oportunidad. */
export function clearFiles(oppId: string): void {
  _store.delete(oppId);
}

/** Clave temporal usada durante el wizard antes de conocer el oppId. */
export const WIZARD_TEMP_KEY = "__wizard_new_opp__";
