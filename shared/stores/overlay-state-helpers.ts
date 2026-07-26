/**
 * Shared state operations for dialog and alert-dialog stores.
 * Both stores manage a Record<string, { isOpen, data }> with identical logic.
 */

type OverlayEntry<TData> = { isOpen: boolean; data?: TData };
type OverlayMap<TData> = Record<string, OverlayEntry<TData>>;

export function openEntry<TData>(
	entries: OverlayMap<TData>,
	id: string,
	data?: TData,
): OverlayMap<TData> {
	return { ...entries, [id]: { isOpen: true, data } };
}

/**
 * Ferme une entrée en CONSERVANT sa `data` : le contenu doit rester rendu
 * pendant l'animation de sortie. Le nettoyage explicite est `clearEntry`.
 *
 * Fermer un id inconnu est un no-op — la version précédente créait une entrée
 * `{ isOpen: false }` à partir de rien, faisant grossir la map d'ids jamais
 * ouverts (les dialogues admin scopés par utilisateur en génèrent un par ligne).
 */
export function closeEntry<TData>(entries: OverlayMap<TData>, id: string): OverlayMap<TData> {
	const entry = entries[id];
	if (!entry) return entries;
	return { ...entries, [id]: { ...entry, isOpen: false } };
}

export function toggleEntry<TData>(entries: OverlayMap<TData>, id: string): OverlayMap<TData> {
	return {
		...entries,
		[id]: { isOpen: !entries[id]?.isOpen, data: entries[id]?.data },
	};
}

export function clearEntry<TData>(entries: OverlayMap<TData>, id: string): OverlayMap<TData> {
	return { ...entries, [id]: { isOpen: false, data: undefined } };
}

export function isEntryOpen<TData>(entries: OverlayMap<TData>, id: string): boolean {
	return entries[id]?.isOpen ?? false;
}

export function getEntryData<TData, T extends TData = TData>(
	entries: OverlayMap<TData>,
	id: string,
): T | undefined {
	return entries[id]?.data as T | undefined;
}
