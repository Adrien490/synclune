"use client";

import { useEffect, useState } from "react";
import {
	type OfflineUploadEndpoint,
	type OfflineUploadEntry,
	entryToFile,
	getQueuedCount,
	listEntries,
	removeEntry,
} from "@/modules/media/lib/offline-upload-queue";

export interface UseOfflineUploadQueueOptions {
	endpoint?: OfflineUploadEndpoint;
	contextKey?: string;
	/** Callback fired when the browser transitions offline → online while entries are queued */
	onReplay?: (entries: OfflineUploadEntry[], files: File[]) => void;
	/** If true, enable auto-replay on reconnect (default: false) */
	autoReplayOnReconnect?: boolean;
}

export interface UseOfflineUploadQueueReturn {
	/** Number of entries currently in the queue (filtered by endpoint/contextKey when provided) */
	queuedCount: number;
	/** Snapshot of queued entries — refreshes whenever the queue changes */
	entries: OfflineUploadEntry[];
	/** Manually trigger a replay — returns the File objects ready to feed into useMediaUpload */
	drainAsFiles: () => Promise<File[]>;
	/** Forget a single queued entry (e.g. after user dismissed it) */
	drop: (id: string) => Promise<void>;
	/** Whether the browser currently reports offline */
	isOffline: boolean;
}

/**
 * Exposes the offline upload queue to a React surface. Designed to pair with
 * useMediaUpload: when the browser regains connectivity, call `drainAsFiles()`
 * and pass the result to `upload()`, removing entries as they succeed.
 */
export function useOfflineUploadQueue(
	options: UseOfflineUploadQueueOptions = {},
): UseOfflineUploadQueueReturn {
	const { endpoint, contextKey, onReplay, autoReplayOnReconnect = false } = options;

	const [queuedCount, setQueuedCount] = useState(0);
	const [entries, setEntries] = useState<OfflineUploadEntry[]>([]);
	const [isOffline, setIsOffline] = useState(() => {
		if (typeof navigator === "undefined") return false;
		return navigator.onLine === false;
	});

	const refresh = async () => {
		try {
			const list = await listEntries({ endpoint, contextKey });
			setEntries(list);
			setQueuedCount(list.length);
		} catch {
			setEntries([]);
			setQueuedCount(0);
		}
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void refresh();
		// refresh periodically while mounted (cheap — IDB count)
		const interval = setInterval(() => {
			void getQueuedCount()
				.then((count) => setQueuedCount((prev) => (prev === count ? prev : count)))
				.catch(() => void 0);
		}, 5000);
		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [endpoint, contextKey]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleOnline = async () => {
			setIsOffline(false);
			if (!autoReplayOnReconnect || !onReplay) return;
			const list = await listEntries({ endpoint, contextKey });
			if (list.length === 0) return;
			onReplay(
				list,
				list.map((e) => entryToFile(e)),
			);
		};
		const handleOffline = () => setIsOffline(true);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [autoReplayOnReconnect, onReplay, endpoint, contextKey]);

	const drainAsFiles = async (): Promise<File[]> => {
		const list = await listEntries({ endpoint, contextKey });
		return list.map((e) => entryToFile(e));
	};

	const drop = async (id: string) => {
		await removeEntry(id);
		await refresh();
	};

	return {
		queuedCount,
		entries,
		drainAsFiles,
		drop,
		isOffline,
	};
}
