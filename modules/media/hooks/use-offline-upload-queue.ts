"use client";

import { useEffect, useRef, useState } from "react";
import {
	type OfflineUploadEndpoint,
	type OfflineUploadEntry,
	entryToFile,
	getQueuedBytes,
	getQueuedCount,
	listEntries,
	purgeStaleEntries,
	removeEntry,
} from "@/modules/media/lib/offline-upload-queue";

export interface UseOfflineUploadQueueOptions {
	endpoint?: OfflineUploadEndpoint;
	contextKey?: string;
	/**
	 * Téléverse les fichiers drainés. Le hook se charge lui-même de drainer, puis de
	 * retirer les entrées rejouées et de rafraîchir le compteur une fois la promesse
	 * résolue — les surfaces n'ont plus à répéter ce cycle (elles le dupliquaient, et
	 * cela imposait un ordre de déclaration fragile au call site).
	 */
	onReplayFiles?: (files: File[]) => void | Promise<void>;
	/** If true, enable auto-replay on reconnect (default: false) */
	autoReplayOnReconnect?: boolean;
	/**
	 * Suspend l'auto-rejeu (typiquement pendant qu'un upload est déjà en vol). Le
	 * rejeu manuel via `replay()` reste possible.
	 */
	paused?: boolean;
}

export interface UseOfflineUploadQueueReturn {
	/** Number of entries currently in the queue (filtered by endpoint/contextKey when provided) */
	queuedCount: number;
	/** Total size of the queued entries, in bytes (same filter as `queuedCount`) */
	queuedBytes: number;
	/** Epoch ms of the oldest queued entry, or `null` when the queue is empty */
	oldestQueuedAt: number | null;
	/** Snapshot of queued entries — refreshes whenever the queue changes */
	entries: OfflineUploadEntry[];
	/** Drain + upload via `onReplayFiles` + drop the replayed entries. No-op without a handler. */
	replay: () => Promise<void>;
	/** Manually trigger a replay — returns the File objects ready to feed into useMediaUpload */
	drainAsFiles: () => Promise<File[]>;
	/** Forget a single queued entry (e.g. after user dismissed it) */
	drop: (id: string) => Promise<void>;
	/** Forget every entry of this surface — backs the banner's "Vider la file" action */
	dropAll: () => Promise<void>;
	/** Whether the browser currently reports offline */
	isOffline: boolean;
}

/**
 * Exposes the offline upload queue to a React surface. Designed to pair with
 * `useMediaUpload({ enableOfflineQueue: true })`: passer `onReplayFiles` et
 * `autoReplayOnReconnect: true`, et le hook s'occupe du cycle complet.
 */
export function useOfflineUploadQueue(
	options: UseOfflineUploadQueueOptions = {},
): UseOfflineUploadQueueReturn {
	const {
		endpoint,
		contextKey,
		onReplayFiles,
		// ⚠️ Défaut `false` conservé volontairement (une surface peut vouloir un rejeu
		// purement manuel), MAIS toute surface qui affiche `OfflineQueueBanner` doit
		// passer `true` : la bannière annonce une reprise automatique. Ce défaut est
		// resté seul en place pendant longtemps, et la promesse était donc fausse.
		autoReplayOnReconnect = false,
		paused = false,
	} = options;

	const [queuedCount, setQueuedCount] = useState(0);
	const [queuedBytes, setQueuedBytes] = useState(0);
	const [oldestQueuedAt, setOldestQueuedAt] = useState<number | null>(null);
	const [entries, setEntries] = useState<OfflineUploadEntry[]>([]);
	const [isOffline, setIsOffline] = useState(() => {
		if (typeof navigator === "undefined") return false;
		return navigator.onLine === false;
	});

	const applyEntries = (list: OfflineUploadEntry[]) => {
		setEntries(list);
		setQueuedCount(list.length);
		setQueuedBytes(list.reduce((sum, e) => sum + e.file.size, 0));
		setOldestQueuedAt(
			list.length === 0 ? null : list.reduce((oldest, e) => Math.min(oldest, e.queuedAt), Infinity),
		);
	};

	const refresh = async () => {
		try {
			applyEntries(await listEntries({ endpoint, contextKey }));
		} catch {
			applyEntries([]);
		}
	};

	useEffect(() => {
		// Garde de péremption : l'`await` peut résoudre après un changement
		// d'endpoint/contextKey ou un démontage — écrire l'état à ce moment
		// remplacerait la liste courante par celle d'une clé abandonnée.
		// (`AbortController` plutôt qu'un `let` booléen : TS ne suit pas
		// l'assignation faite dans la closure de cleanup et croirait le drapeau
		// toujours faux.)
		const abort = new AbortController();
		void (async () => {
			try {
				// Purge d'entrée : il n'y a pas de cron côté navigateur, et une file
				// jamais purgée grossit indéfiniment. Un échec de purge ne doit pas
				// empêcher la lecture — d'où le `catch` interne.
				await purgeStaleEntries().catch(() => 0);
				const list = await listEntries({ endpoint, contextKey });
				if (abort.signal.aborted) return;
				applyEntries(list);
			} catch {
				if (abort.signal.aborted) return;
				applyEntries([]);
			}
		})();
		// Rafraîchissement périodique — ⚠️ le filtre `{ endpoint, contextKey }` est
		// OBLIGATOIRE ici. Sans lui, `getQueuedCount()` comptait TOUTE la base et
		// écrasait au bout de 5 s le compteur filtré du montage : une photo d'avis en
		// échec faisait apparaître « 1 fichier en attente » sur le formulaire produit,
		// où « Relancer » drainait une liste filtrée (donc vide) sans rien effacer.
		const interval = setInterval(() => {
			void Promise.all([
				getQueuedCount({ endpoint, contextKey }),
				getQueuedBytes({ endpoint, contextKey }),
			])
				.then(([count, bytes]) => {
					setQueuedCount((prev) => (prev === count ? prev : count));
					setQueuedBytes((prev) => (prev === bytes ? prev : bytes));
				})
				.catch(() => void 0);
		}, 5000);
		return () => {
			abort.abort();
			clearInterval(interval);
		};
	}, [endpoint, contextKey]);

	/**
	 * Cycle complet : drainer, téléverser, retirer les entrées rejouées, rafraîchir.
	 *
	 * Les entrées ne sont retirées qu'**après** résolution de `onReplayFiles` : un
	 * échec laisse la file intacte, donc rejouable. Le rejeu est aussi sérialisé par
	 * `isReplayingRef` — sans quoi un `online` suivi d'un clic sur « Relancer »
	 * téléversait deux fois le même lot.
	 */
	const isReplayingRef = useRef(false);
	const replay = async () => {
		if (!onReplayFiles || isReplayingRef.current) return;
		isReplayingRef.current = true;
		try {
			const list = await listEntries({ endpoint, contextKey });
			if (list.length === 0) return;
			await onReplayFiles(list.map((e) => entryToFile(e)));
			for (const entry of list) {
				await removeEntry(entry.id);
			}
			await refresh();
		} finally {
			isReplayingRef.current = false;
		}
	};

	// Refs de dernier appel : le listener `online` doit voir la valeur courante sans
	// être ré-attaché à chaque render (une fonction inline au call site changerait
	// d'identité en continu).
	const replayRef = useRef(replay);
	const pausedRef = useRef(paused);
	useEffect(() => {
		replayRef.current = replay;
		pausedRef.current = paused;
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleOnline = () => {
			setIsOffline(false);
			if (!autoReplayOnReconnect || pausedRef.current) return;
			void replayRef.current();
		};
		const handleOffline = () => setIsOffline(true);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [autoReplayOnReconnect]);

	const drainAsFiles = async (): Promise<File[]> => {
		const list = await listEntries({ endpoint, contextKey });
		return list.map((e) => entryToFile(e));
	};

	const drop = async (id: string) => {
		await removeEntry(id);
		await refresh();
	};

	/**
	 * Vide la file **de cette surface seulement**. Sert le « Vider la file » de la
	 * bannière : sans lui, une file bloquée (fichier périmé, contexte disparu)
	 * laissait une bannière indéracinable — l'action était câblée dans le composant
	 * mais aucun appelant ne fournissait `onDismiss`.
	 */
	const dropAll = async () => {
		const list = await listEntries({ endpoint, contextKey });
		for (const entry of list) {
			await removeEntry(entry.id);
		}
		await refresh();
	};

	return {
		queuedCount,
		queuedBytes,
		oldestQueuedAt,
		entries,
		replay,
		drainAsFiles,
		drop,
		dropAll,
		isOffline,
	};
}
