import { describe, it, expect } from "vitest";

import {
	computeThroughput,
	computeEtaSeconds,
	formatEtaLabel,
	formatSpeedLabel,
	formatBytesShort,
	type ThroughputSample,
} from "../format-eta";

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

describe("computeThroughput", () => {
	it("returns 0 when fewer than 2 samples are provided", () => {
		expect(computeThroughput([])).toBe(0);
		expect(computeThroughput([{ bytes: 0, timestamp: 0 }])).toBe(0);
	});

	it("returns 0 when window contains a single sample after filtering", () => {
		const samples: ThroughputSample[] = [
			{ bytes: 0, timestamp: 0 },
			{ bytes: 1000, timestamp: 10_000 },
		];
		// windowMs=3000 → only the second sample is within window — degenerate to single-point
		expect(computeThroughput(samples, 3000)).toBe(0);
	});

	it("returns 0 when elapsed time inside the window is below 500ms", () => {
		const samples: ThroughputSample[] = [
			{ bytes: 0, timestamp: 1000 },
			{ bytes: 100_000, timestamp: 1300 },
		];
		expect(computeThroughput(samples, 5000)).toBe(0);
	});

	it("returns 0 when bytes delta is zero or negative (stalled)", () => {
		const samples: ThroughputSample[] = [
			{ bytes: 50_000, timestamp: 0 },
			{ bytes: 50_000, timestamp: 2000 },
		];
		expect(computeThroughput(samples)).toBe(0);
	});

	it("computes bytes/sec from the sliding window", () => {
		// 2 MB transferred in 2s → 1 MB/s
		const samples: ThroughputSample[] = [
			{ bytes: 0, timestamp: 0 },
			{ bytes: 2 * MB, timestamp: 2000 },
		];
		expect(computeThroughput(samples)).toBeCloseTo(MB, 0);
	});

	it("only considers samples within the sliding window", () => {
		// First (old) sample falls outside the 3s window — should be ignored
		const samples: ThroughputSample[] = [
			{ bytes: 0, timestamp: 0 },
			{ bytes: MB, timestamp: 8000 },
			{ bytes: 3 * MB, timestamp: 10_000 },
		];
		// Effective window: 8000→10000 (2s, 2 MB delta) → 1 MB/s
		expect(computeThroughput(samples, 3000)).toBeCloseTo(MB, 0);
	});
});

describe("computeEtaSeconds", () => {
	it("returns null when throughput is below the trust floor (100 KB/s)", () => {
		expect(computeEtaSeconds(0, 10 * MB, 50 * KB)).toBeNull();
	});

	it("returns 0 when remaining bytes is zero", () => {
		expect(computeEtaSeconds(10 * MB, 10 * MB, MB)).toBe(0);
	});

	it("returns 0 when remaining bytes is negative", () => {
		expect(computeEtaSeconds(11 * MB, 10 * MB, MB)).toBe(0);
	});

	it("computes ETA seconds, rounding up", () => {
		// 5 MB remaining at 1 MB/s → 5s
		expect(computeEtaSeconds(5 * MB, 10 * MB, MB)).toBe(5);
	});

	it("rounds up fractional seconds (avoids 'Reste 0s' jitter)", () => {
		// 1.2 MB remaining at 1 MB/s → ceil(1.2) = 2s
		expect(computeEtaSeconds(8.8 * MB, 10 * MB, MB)).toBe(2);
	});
});

describe("formatEtaLabel", () => {
	it("returns null for null/undefined input", () => {
		expect(formatEtaLabel(null)).toBeNull();
		expect(formatEtaLabel(undefined)).toBeNull();
	});

	it("returns 'Presque terminé' for zero or negative seconds", () => {
		expect(formatEtaLabel(0)).toBe("Presque terminé");
		expect(formatEtaLabel(-5)).toBe("Presque terminé");
	});

	it("formats seconds-only when below 60s", () => {
		expect(formatEtaLabel(1)).toBe("Reste 1s");
		expect(formatEtaLabel(45)).toBe("Reste 45s");
		expect(formatEtaLabel(59)).toBe("Reste 59s");
	});

	it("formats minutes only when < 1h", () => {
		expect(formatEtaLabel(60)).toBe("Reste 1min");
		expect(formatEtaLabel(120)).toBe("Reste 2min");
		expect(formatEtaLabel(90)).toBe("Reste 2min"); // ceil
		expect(formatEtaLabel(3599)).toBe("Reste 60min");
	});

	it("formats h + min when ≥ 1h", () => {
		expect(formatEtaLabel(3600)).toBe("Reste 1h");
		expect(formatEtaLabel(3660)).toBe("Reste 1h 1min");
		expect(formatEtaLabel(7200)).toBe("Reste 2h");
		expect(formatEtaLabel(7260)).toBe("Reste 2h 1min");
	});

	it("rounds the minute remainder for h+min display", () => {
		// 1h29min30s → 1h 30min (round)
		expect(formatEtaLabel(3600 + 29 * 60 + 30)).toBe("Reste 1h 30min");
	});
});

describe("formatSpeedLabel", () => {
	it("returns null below the trust floor (1 KB/s)", () => {
		expect(formatSpeedLabel(0)).toBeNull();
		expect(formatSpeedLabel(null)).toBeNull();
		expect(formatSpeedLabel(undefined)).toBeNull();
		expect(formatSpeedLabel(500)).toBeNull();
	});

	it("formats Ko/s when below 1 MB/s", () => {
		expect(formatSpeedLabel(KB)).toBe("1 Ko/s");
		expect(formatSpeedLabel(150 * KB)).toBe("150 Ko/s");
	});

	it("formats Mo/s with 1 decimal when ≥ 1 MB/s", () => {
		expect(formatSpeedLabel(MB)).toBe("1.0 Mo/s");
		expect(formatSpeedLabel(2.5 * MB)).toBe("2.5 Mo/s");
	});
});

describe("formatBytesShort", () => {
	it("formats Ko under 1 MB", () => {
		expect(formatBytesShort(0)).toBe("0 Ko");
		expect(formatBytesShort(KB)).toBe("1 Ko");
		expect(formatBytesShort(900 * KB)).toBe("900 Ko");
	});

	it("formats Mo with 1 decimal under 1 GB", () => {
		expect(formatBytesShort(MB)).toBe("1.0 Mo");
		expect(formatBytesShort(2.4 * MB)).toBe("2.4 Mo");
	});

	it("formats Go with 2 decimals at ≥ 1 GB", () => {
		expect(formatBytesShort(GB)).toBe("1.00 Go");
		expect(formatBytesShort(2.5 * GB)).toBe("2.50 Go");
	});
});
