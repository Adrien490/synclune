import { describe, expect, it } from "vitest";
import { formatBytesShort } from "../format-bytes";

/**
 * Extrait de `format-eta.test.ts` au Lot 5/S4.4 (2026-08-03) : les suites ETA
 * (`computeThroughput`, `computeEtaSeconds`, `formatEtaLabel`, `formatSpeedLabel`)
 * sont parties avec la file d'upload hors-ligne. Seul ce formateur survit — il
 * rend les tailles de fichiers dans les messages d'erreur et la grille d'attente.
 */
describe("formatBytesShort", () => {
	it("rend les Ko sans décimale sous 1 Mo", () => {
		expect(formatBytesShort(0)).toBe("0 Ko");
		expect(formatBytesShort(512)).toBe("1 Ko");
		expect(formatBytesShort(1024)).toBe("1 Ko");
		expect(formatBytesShort(500 * 1024)).toBe("500 Ko");
	});

	it("bascule en Mo avec une décimale, VIRGULE française", () => {
		// « 1.0 Mo » mélangeait point anglophone et unité française — le propre
		// JSDoc d'upload-helpers cite « 5,6 Mo / 12,0 Mo ».
		expect(formatBytesShort(1024 * 1024)).toBe("1,0 Mo");
		expect(formatBytesShort(2.5 * 1024 * 1024)).toBe("2,5 Mo");
	});

	it("bascule en Go avec deux décimales, VIRGULE française", () => {
		expect(formatBytesShort(1024 * 1024 * 1024)).toBe("1,00 Go");
		expect(formatBytesShort(1.75 * 1024 * 1024 * 1024)).toBe("1,75 Go");
	});

	// La copie utilisateur est en français (CLAUDE.md § Conventions) : jamais KB/MB/GB.
	it("utilise les unités françaises, jamais les anglaises", () => {
		const samples = [500, 5 * 1024 * 1024, 5 * 1024 * 1024 * 1024].map(formatBytesShort);
		for (const label of samples) {
			expect(label).not.toMatch(/\b[KMG]B\b/);
		}
		expect(samples.join(" ")).toMatch(/Ko|Mo|Go/);
	});
});
