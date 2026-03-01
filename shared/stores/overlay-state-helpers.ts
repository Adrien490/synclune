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

export function closeEntry<TData>(entries: OverlayMap<TData>, id: string): OverlayMap<TData> {
	return { ...entries, [id]: { ...entries[id], isOpen: false } };
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
