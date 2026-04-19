"use client";

/**
 * Offline Upload Queue — IndexedDB-backed buffer for files that failed to upload
 * due to network issues. When the browser comes back online, queued files can
 * be retrieved and replayed via the standard useMediaUpload hook.
 *
 * Storage model (IndexedDB `synclune-offline-uploads`, object store `pending`):
 *   {
 *     id: string (UUID)
 *     file: Blob
 *     fileName: string
 *     mediaType: "IMAGE" | "VIDEO"
 *     endpoint: "catalogMedia" | "reviewMedia"
 *     queuedAt: number (epoch ms)
 *     contextKey?: string (caller-supplied routing key to replay in the right surface)
 *   }
 *
 * Cap: total size of queued blobs is limited to 50 Mo. When the cap is reached,
 * `enqueue()` throws OfflineQueueFullError.
 */

const DB_NAME = "synclune-offline-uploads";
const DB_VERSION = 1;
const STORE_NAME = "pending";

export const OFFLINE_QUEUE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export type OfflineUploadEndpoint = "catalogMedia" | "reviewMedia";

export interface OfflineUploadEntry {
	id: string;
	file: Blob;
	fileName: string;
	fileType: string;
	mediaType: "IMAGE" | "VIDEO";
	endpoint: OfflineUploadEndpoint;
	queuedAt: number;
	contextKey?: string;
}

export class OfflineQueueFullError extends Error {
	constructor() {
		super("La file d'attente hors-ligne est pleine (50 Mo max)");
		this.name = "OfflineQueueFullError";
	}
}

function isIndexedDBAvailable(): boolean {
	return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!isIndexedDBAvailable()) {
			reject(new Error("IndexedDB non disponible"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error ?? new Error("IDB open error"));
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
				store.createIndex("queuedAt", "queuedAt");
				store.createIndex("endpoint", "endpoint");
				store.createIndex("contextKey", "contextKey");
			}
		};
	});
}

function generateId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function txStore(
	mode: IDBTransactionMode,
): Promise<{ db: IDBDatabase; store: IDBObjectStore }> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, mode);
	return { db, store: tx.objectStore(STORE_NAME) };
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("IDB request error"));
	});
}

export interface EnqueueParams {
	file: File;
	endpoint: OfflineUploadEndpoint;
	contextKey?: string;
}

export async function enqueue(params: EnqueueParams): Promise<OfflineUploadEntry> {
	const { file, endpoint, contextKey } = params;

	if (!isIndexedDBAvailable()) {
		throw new Error("IndexedDB non disponible");
	}

	const currentBytes = await getQueuedBytes();
	if (currentBytes + file.size > OFFLINE_QUEUE_MAX_BYTES) {
		throw new OfflineQueueFullError();
	}

	const entry: OfflineUploadEntry = {
		id: generateId(),
		file,
		fileName: file.name,
		fileType: file.type || "application/octet-stream",
		mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
		endpoint,
		queuedAt: Date.now(),
		contextKey,
	};

	const { store } = await txStore("readwrite");
	await requestToPromise(store.add(entry));
	return entry;
}

export async function listEntries(filter?: {
	endpoint?: OfflineUploadEndpoint;
	contextKey?: string;
}): Promise<OfflineUploadEntry[]> {
	if (!isIndexedDBAvailable()) return [];
	const { store } = await txStore("readonly");
	const entries = (await requestToPromise(
		store.getAll() as IDBRequest<OfflineUploadEntry[]>,
	)) as OfflineUploadEntry[];
	if (!filter) return entries;
	return entries.filter(
		(e) =>
			(!filter.endpoint || e.endpoint === filter.endpoint) &&
			(!filter.contextKey || e.contextKey === filter.contextKey),
	);
}

export async function getQueuedCount(): Promise<number> {
	if (!isIndexedDBAvailable()) return 0;
	const { store } = await txStore("readonly");
	return requestToPromise(store.count());
}

export async function getQueuedBytes(): Promise<number> {
	const entries = await listEntries();
	return entries.reduce((sum, e) => sum + e.file.size, 0);
}

export async function removeEntry(id: string): Promise<void> {
	if (!isIndexedDBAvailable()) return;
	const { store } = await txStore("readwrite");
	await requestToPromise(store.delete(id));
}

export async function clearAll(): Promise<void> {
	if (!isIndexedDBAvailable()) return;
	const { store } = await txStore("readwrite");
	await requestToPromise(store.clear());
}

/**
 * Converts a stored entry back into a File that can be re-fed to useMediaUpload.
 * The File.lastModified is set to entry.queuedAt so UI keys stay stable.
 */
export function entryToFile(entry: OfflineUploadEntry): File {
	return new File([entry.file], entry.fileName, {
		type: entry.fileType,
		lastModified: entry.queuedAt,
	});
}
