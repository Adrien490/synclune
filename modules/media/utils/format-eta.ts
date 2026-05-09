/**
 * Upload ETA + speed formatting utilities.
 *
 * Used by useMediaUpload (sliding-window throughput estimation) and the
 * UploadProgress component (human-readable French labels).
 */

/** Minimum trustworthy throughput before showing ETA — avoids "Reste 47h" jitter on stalled connections */
const MIN_TRUSTED_BPS = 100 * 1024; // 100 KB/s

export interface ThroughputSample {
	/** Cumulative bytes uploaded at this point */
	bytes: number;
	/** Timestamp in ms (performance.now() compatible) */
	timestamp: number;
}

/**
 * Compute throughput (bytes/sec) over a sliding window of samples.
 * Returns 0 if window is < 500ms or contains < 2 samples.
 */
export function computeThroughput(samples: ThroughputSample[], windowMs = 3000): number {
	if (samples.length < 2) return 0;

	const last = samples.at(-1)!;
	const cutoff = last.timestamp - windowMs;
	const inWindow = samples.filter((s) => s.timestamp >= cutoff);
	if (inWindow.length < 2) return 0;

	const first = inWindow[0]!;
	const elapsedSec = (last.timestamp - first.timestamp) / 1000;
	if (elapsedSec < 0.5) return 0;

	const bytesDelta = last.bytes - first.bytes;
	if (bytesDelta <= 0) return 0;

	return bytesDelta / elapsedSec;
}

/**
 * Compute ETA in seconds. Returns null if throughput is too low to trust
 * or if remaining bytes is non-positive.
 */
export function computeEtaSeconds(
	bytesUploaded: number,
	bytesTotal: number,
	bytesPerSecond: number,
): number | null {
	if (bytesPerSecond < MIN_TRUSTED_BPS) return null;
	const remaining = bytesTotal - bytesUploaded;
	if (remaining <= 0) return 0;
	return Math.ceil(remaining / bytesPerSecond);
}

/**
 * Format seconds as a French human-readable label.
 * Buckets: < 1min → "Reste Xs", < 60min → "Reste Xmin", else → "Reste Xh Ymin".
 */
export function formatEtaLabel(etaSeconds: number | null | undefined): string | null {
	if (etaSeconds === null || etaSeconds === undefined) return null;
	if (etaSeconds <= 0) return "Presque terminé";

	if (etaSeconds < 60) {
		return `Reste ${etaSeconds}s`;
	}
	if (etaSeconds < 3600) {
		const min = Math.ceil(etaSeconds / 60);
		return `Reste ${min}min`;
	}
	const h = Math.floor(etaSeconds / 3600);
	const min = Math.round((etaSeconds % 3600) / 60);
	return min > 0 ? `Reste ${h}h ${min}min` : `Reste ${h}h`;
}

/**
 * Format bytes-per-second as a French label (KB/s or MB/s).
 * Returns null when throughput is below the trust floor.
 */
export function formatSpeedLabel(bytesPerSecond: number | null | undefined): string | null {
	if (!bytesPerSecond || bytesPerSecond < 1024) return null;
	if (bytesPerSecond < 1024 * 1024) {
		return `${(bytesPerSecond / 1024).toFixed(0)} Ko/s`;
	}
	return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} Mo/s`;
}

/**
 * Format a byte count as a French human-readable size (Mo / Go).
 */
export function formatBytesShort(bytes: number): string {
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(0)} Ko`;
	}
	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
	}
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
