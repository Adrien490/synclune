/**
 * @regression offline-queue-count-stays-scoped
 *
 * Audit UI/UX file upload — la bannière « fichiers en attente de connexion »
 * devenait une bannière FANTÔME INDÉRACINABLE.
 *
 * Chaîne d'échec reproduite ici :
 *
 * 1. au montage, le compteur venait de `listEntries({ endpoint, contextKey })` —
 *    correctement filtré par surface ;
 * 2. cinq secondes plus tard, le `setInterval` l'écrasait avec `getQueuedCount()`
 *    appelé **sans aucun argument**, qui exécutait un `store.count()` global ;
 * 3. une entrée en échec hors-ligne appartenant à une AUTRE surface faisait donc
 *    apparaître « 1 fichier en attente » sur le formulaire produit admin, qui
 *    n'avait rien en file (le cas d'origine venait des photos d'avis, surface
 *    depuis retirée — le défaut, lui, est générique à deux surfaces quelconques) ;
 * 4. « Relancer » drainait `drainAsFiles()`, lui filtré, qui renvoyait `[]` et
 *    sortait immédiatement sans rien effacer ;
 * 5. et `onDismiss` n'était passé par aucun appelant : le bouton « Vider la file »
 *    et sa confirmation étaient du code mort. La bannière ne pouvait plus partir.
 *
 * On teste le hook, pas IndexedDB : le défaut était la **perte du filtre** entre le
 * montage et le ticker, pas le comptage lui-même (et jsdom n'a pas d'IndexedDB).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, act } from "@testing-library/react";

const {
	mockGetQueuedBytes,
	mockGetQueuedCount,
	mockListEntries,
	mockPurgeStaleEntries,
	mockRemoveEntry,
} = vi.hoisted(() => ({
	mockGetQueuedBytes: vi.fn(),
	mockGetQueuedCount: vi.fn(),
	mockListEntries: vi.fn(),
	mockPurgeStaleEntries: vi.fn(),
	mockRemoveEntry: vi.fn(),
}));

vi.mock("@/modules/media/lib/offline-upload-queue", () => ({
	getQueuedBytes: mockGetQueuedBytes,
	getQueuedCount: mockGetQueuedCount,
	listEntries: mockListEntries,
	purgeStaleEntries: mockPurgeStaleEntries,
	removeEntry: mockRemoveEntry,
	entryToFile: (e: { fileName: string; fileType: string }) =>
		new File([""], e.fileName, { type: e.fileType }),
}));

import { useOfflineUploadQueue } from "../use-offline-upload-queue";

const CATALOG_SCOPE = { endpoint: "catalogMedia" as const, contextKey: "create-product" };

/**
 * `replay()` enchaîne plusieurs `await` (listEntries → onReplayFiles → removeEntry) :
 * un seul `Promise.resolve()` ne suffit pas à les traverser.
 */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function entry(overrides: Partial<{ id: string; contextKey: string }> = {}) {
	return {
		id: overrides.id ?? "entry-1",
		file: new Blob([new Uint8Array(1024)]),
		fileName: "photo.webp",
		fileType: "image/webp",
		mediaType: "IMAGE" as const,
		endpoint: "catalogMedia" as const,
		queuedAt: 1_700_000_000_000,
		contextKey: overrides.contextKey ?? "create-product",
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockListEntries.mockResolvedValue([]);
	mockGetQueuedCount.mockResolvedValue(0);
	mockGetQueuedBytes.mockResolvedValue(0);
	mockPurgeStaleEntries.mockResolvedValue(0);
	mockRemoveEntry.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("périmètre du compteur de file hors-ligne", () => {
	it("transmet le filtre de surface au rafraîchissement périodique", async () => {
		vi.useFakeTimers();

		renderHook(() => useOfflineUploadQueue(CATALOG_SCOPE));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5_100);
		});

		expect(mockGetQueuedCount).toHaveBeenCalled();
		// ⚠️ Le cœur de la régression : `getQueuedCount()` était appelé SANS argument.
		for (const call of mockGetQueuedCount.mock.calls) {
			expect(call[0]).toEqual(CATALOG_SCOPE);
		}
		for (const call of mockGetQueuedBytes.mock.calls) {
			expect(call[0]).toEqual(CATALOG_SCOPE);
		}
	});

	it("ne compte jamais les entrées d'une autre surface, même après le ticker", async () => {
		vi.useFakeTimers();

		// Le store contient UNE entrée, appartenant à une AUTRE surface. On émule le
		// vrai contrat de la couche IndexedDB : filtre honoré si fourni, sinon TOUT le
		// store est compté. C'est ce dernier chemin qui faisait fuiter le compte d'une
		// surface vers l'autre — un mock qui renvoie 0 sans filtre rendrait ce test
		// aveugle au défaut qu'il est censé attraper.
		const store = [entry({ contextKey: "other-surface" })];
		const matching = (filter?: { contextKey?: string }) =>
			filter?.contextKey ? store.filter((e) => e.contextKey === filter.contextKey) : store;
		mockListEntries.mockImplementation(async (filter?: { contextKey?: string }) =>
			matching(filter),
		);
		mockGetQueuedCount.mockImplementation(
			async (filter?: { contextKey?: string }) => matching(filter).length,
		);
		mockGetQueuedBytes.mockImplementation(async (filter?: { contextKey?: string }) =>
			matching(filter).reduce((sum, e) => sum + e.file.size, 0),
		);

		const { result } = renderHook(() => useOfflineUploadQueue(CATALOG_SCOPE));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5_100);
		});

		expect(result.current.queuedCount).toBe(0);
	});

	it("expose le volume et l'âge de la file pour que la bannière soit lisible", async () => {
		mockListEntries.mockResolvedValue([entry()]);

		const { result } = renderHook(() => useOfflineUploadQueue(CATALOG_SCOPE));
		await act(async () => {
			await flushMicrotasks();
		});

		expect(result.current.queuedCount).toBe(1);
		expect(result.current.queuedBytes).toBe(1024);
		// `queuedAt` était stocké et jamais affiché : rien ne distinguait une file
		// d'il y a trente secondes d'une file oubliée depuis trois jours.
		expect(result.current.oldestQueuedAt).toBe(1_700_000_000_000);
	});

	it("purge les entrées périmées au montage", async () => {
		renderHook(() => useOfflineUploadQueue(CATALOG_SCOPE));
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockPurgeStaleEntries).toHaveBeenCalled();
	});
});

describe("sortie de la file hors-ligne", () => {
	it("vide la file de la surface via dropAll — l'action n'était câblée nulle part", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" }), entry({ id: "b" })]);

		const { result } = renderHook(() => useOfflineUploadQueue(CATALOG_SCOPE));
		await act(async () => {
			await result.current.dropAll();
		});

		expect(mockRemoveEntry).toHaveBeenCalledWith("a");
		expect(mockRemoveEntry).toHaveBeenCalledWith("b");
	});

	it("rejoue la file et ne retire les entrées qu'après un upload réussi", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" })]);
		const onReplayFiles = vi.fn().mockResolvedValue(undefined);

		const { result } = renderHook(() => useOfflineUploadQueue({ ...CATALOG_SCOPE, onReplayFiles }));
		await act(async () => {
			await result.current.replay();
		});

		expect(onReplayFiles).toHaveBeenCalledTimes(1);
		expect(mockRemoveEntry).toHaveBeenCalledWith("a");
	});

	it("laisse la file intacte quand l'upload de rejeu échoue", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" })]);
		const onReplayFiles = vi.fn().mockRejectedValue(new Error("hors ligne"));

		const { result } = renderHook(() => useOfflineUploadQueue({ ...CATALOG_SCOPE, onReplayFiles }));
		await act(async () => {
			await result.current.replay().catch(() => undefined);
		});

		// Retirer l'entrée avant confirmation perdrait le fichier définitivement.
		expect(mockRemoveEntry).not.toHaveBeenCalled();
	});

	it("sérialise les rejeux concurrents", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" })]);
		let resolveUpload: (() => void) | undefined;
		const onReplayFiles = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveUpload = resolve;
				}),
		);

		const { result } = renderHook(() => useOfflineUploadQueue({ ...CATALOG_SCOPE, onReplayFiles }));

		await act(async () => {
			// Le second appel doit court-circuiter dès l'entrée : `isReplayingRef` est
			// posé de façon synchrone, avant le premier `await`.
			const first = result.current.replay();
			const second = result.current.replay();
			// Laisser le premier rejeu atteindre `onReplayFiles` avant de le débloquer.
			await flushMicrotasks();
			resolveUpload?.();
			await Promise.all([first, second]);
		});

		// Un `online` suivi d'un clic sur « Relancer » téléverserait deux fois le lot.
		expect(onReplayFiles).toHaveBeenCalledTimes(1);
	});
});

describe("reprise automatique au retour en ligne", () => {
	it("rejoue quand `autoReplayOnReconnect` est activé", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" })]);
		const onReplayFiles = vi.fn().mockResolvedValue(undefined);

		renderHook(() =>
			useOfflineUploadQueue({
				...CATALOG_SCOPE,
				onReplayFiles,
				autoReplayOnReconnect: true,
			}),
		);

		await act(async () => {
			window.dispatchEvent(new Event("online"));
			await flushMicrotasks();
		});

		// ⚠️ La bannière annonce « L'envoi reprendra tout seul dès que tu seras de
		// nouveau en ligne. » Cette option existait avec un défaut `false` qu'AUCUNE
		// surface ne passait : la promesse était fausse et le fichier restait en file
		// indéfiniment.
		expect(onReplayFiles).toHaveBeenCalledTimes(1);
	});

	it("ne rejoue pas par-dessus un upload déjà en vol", async () => {
		mockListEntries.mockResolvedValue([entry({ id: "a" })]);
		const onReplayFiles = vi.fn().mockResolvedValue(undefined);

		renderHook(() =>
			useOfflineUploadQueue({
				...CATALOG_SCOPE,
				onReplayFiles,
				autoReplayOnReconnect: true,
				paused: true,
			}),
		);

		await act(async () => {
			window.dispatchEvent(new Event("online"));
			await flushMicrotasks();
		});

		expect(onReplayFiles).not.toHaveBeenCalled();
	});
});
