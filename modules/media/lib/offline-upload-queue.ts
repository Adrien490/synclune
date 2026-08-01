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
 *     endpoint: "catalogMedia"
 *     queuedAt: number (epoch ms)
 *     contextKey?: string (caller-supplied routing key to replay in the right surface)
 *   }
 *
 * Cap: total size of queued blobs is limited to OFFLINE_QUEUE_MAX_BYTES. When the
 * cap is reached, `enqueue()` throws OfflineQueueFullError.
 */

import {
	MAX_UPLOAD_COUNT_VIDEO,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits";

const DB_NAME = "synclune-offline-uploads";
const DB_VERSION = 1;
const STORE_NAME = "pending";

/**
 * Plafond de volume de la file, **dérivé de la SSOT des plafonds d'upload**.
 *
 * ⚠️ Il valait 50 Mo en dur, soit moins qu'une seule vidéo catalogue autorisée
 * (64 Mo) : `enqueue` levait donc systématiquement `OfflineQueueFullError` pour
 * une vidéo, ce qui affichait « File hors-ligne pleine — reconnectez-vous pour
 * reprendre vos téléversements en attente » alors que la file pouvait être
 * **vide** et qu'il n'y avait rien à reprendre. La file était structurellement
 * incapable d'accueillir le plus gros fichier que l'application accepte.
 *
 * Invariant tenu par `offline-queue-scope.regression.test.ts` : ce plafond est
 * toujours ≥ au plus gros fichier téléversable.
 */
export const OFFLINE_QUEUE_MAX_BYTES = MAX_UPLOAD_SIZE_VIDEO * MAX_UPLOAD_COUNT_VIDEO;

export type OfflineUploadEndpoint = "catalogMedia";

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
		const maxMo = Math.round(OFFLINE_QUEUE_MAX_BYTES / 1024 / 1024);
		super(`La file d'attente hors-ligne est pleine (${maxMo} Mo max)`);
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
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `OfflineUploadEndpoint` n'a plus qu'un membre depuis le retrait des photos d'avis, donc la comparaison est tautologique AUJOURD'HUI. On la garde : c'est elle qui isole les surfaces les unes des autres, et un second endpoint ajouté sans elle hériterait silencieusement du compte global — exactement le défaut que `offline-queue-scope.regression.test.ts` verrouille.
			(!filter.endpoint || e.endpoint === filter.endpoint) &&
			(!filter.contextKey || e.contextKey === filter.contextKey),
	);
}

/**
 * Nombre d'entrées en file, **filtrable par surface**.
 *
 * ⚠️ Le filtre n'est pas optionnel par confort : sans lui, cette fonction faisait
 * un `store.count()` global et le ticker de `useOfflineUploadQueue` écrasait, au
 * bout de 5 s, le compteur filtré du montage. Une photo d'avis en échec hors-ligne
 * faisait donc apparaître « 1 fichier en attente de connexion » sur le formulaire
 * produit admin — où « Relancer » drainait une liste filtrée, donc vide, et la
 * bannière ne pouvait plus disparaître.
 */
export async function getQueuedCount(filter?: {
	endpoint?: OfflineUploadEndpoint;
	contextKey?: string;
}): Promise<number> {
	if (!isIndexedDBAvailable()) return 0;
	// Sans filtre, `store.count()` évite de désérialiser tous les Blobs.
	if (!filter?.endpoint && !filter?.contextKey) {
		const { store } = await txStore("readonly");
		return requestToPromise(store.count());
	}
	const entries = await listEntries(filter);
	return entries.length;
}

/** Volume total des entrées en file (octets), filtrable comme `listEntries`. */
export async function getQueuedBytes(filter?: {
	endpoint?: OfflineUploadEndpoint;
	contextKey?: string;
}): Promise<number> {
	const entries = await listEntries(filter);
	return entries.reduce((sum, e) => sum + e.file.size, 0);
}

/**
 * Durée de vie d'une entrée en file. Au-delà, le fichier est très probablement
 * périmé (bijou déjà publié depuis, photo reprise autrement) et il occupe du
 * quota IndexedDB pour rien.
 */
const OFFLINE_QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Supprime les entrées plus vieilles que `maxAgeMs`. Renvoie le nombre purgé.
 * Appelée au montage de `useOfflineUploadQueue` — il n'y a pas de cron côté
 * navigateur, et une file jamais purgée gonfle indéfiniment.
 */
export async function purgeStaleEntries(
	maxAgeMs: number = OFFLINE_QUEUE_MAX_AGE_MS,
	now: number = Date.now(),
): Promise<number> {
	if (!isIndexedDBAvailable()) return 0;
	const entries = await listEntries();
	const stale = entries.filter((e) => now - e.queuedAt > maxAgeMs);
	for (const entry of stale) {
		await removeEntry(entry.id);
	}
	return stale.length;
}

export async function removeEntry(id: string): Promise<void> {
	if (!isIndexedDBAvailable()) return;
	const { store } = await txStore("readwrite");
	await requestToPromise(store.delete(id));
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
