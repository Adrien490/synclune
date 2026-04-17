import { describe, it, expect } from "vitest";

import { buildReviewExport, escapeCsvCell } from "../review-export.service";
import type { ReviewExportRow } from "../../data/get-reviews-for-export";

// ============================================================================
// FIXTURES
// ============================================================================

function makeRow(overrides?: Partial<ReviewExportRow>): ReviewExportRow {
	const base: ReviewExportRow = {
		id: "cm1234567890abcdefghijklm",
		rating: 5,
		title: "Super produit",
		content: "Vraiment genial",
		status: "PUBLISHED",
		createdAt: new Date("2026-04-10T08:00:00Z"),
		updatedAt: new Date("2026-04-10T08:00:00Z"),
		deletedAt: null,
		user: { id: "u1", name: "Jeanne D.", email: "jeanne@test.fr" },
		product: { id: "p1", title: "Bague Moon", slug: "bague-moon" },
		medias: [{ url: "https://utfs.io/f/a.jpg" }, { url: "https://utfs.io/f/b.jpg" }],
		response: null,
		orderItem: {
			id: "oi1",
			order: {
				id: "o1",
				orderNumber: "ORD-2026-00042",
				reviewRequestSentAt: new Date("2026-04-11T08:00:00Z"),
				reviewReminderSentAt: null,
			},
		},
	};
	return { ...base, ...overrides } as ReviewExportRow;
}

// ============================================================================
// CSV ESCAPE TESTS (RFC 4180)
// ============================================================================

describe("escapeCsvCell", () => {
	it("returns empty string for null/undefined", () => {
		expect(escapeCsvCell(null)).toBe("");
		expect(escapeCsvCell(undefined)).toBe("");
	});

	it("returns the raw value when no escaping needed", () => {
		expect(escapeCsvCell("simple")).toBe("simple");
		expect(escapeCsvCell(42)).toBe("42");
	});

	it("quotes values containing commas", () => {
		expect(escapeCsvCell("a,b")).toBe('"a,b"');
	});

	it("quotes values containing double quotes and doubles them", () => {
		expect(escapeCsvCell('a"b')).toBe('"a""b"');
	});

	it("quotes values containing newlines", () => {
		expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
		expect(escapeCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
	});

	it("quotes values with leading or trailing whitespace", () => {
		expect(escapeCsvCell(" space ")).toBe('" space "');
	});
});

// ============================================================================
// BUILD EXPORT TESTS
// ============================================================================

describe("buildReviewExport", () => {
	it("produces a CSV payload with correct mime type and filename", () => {
		const result = buildReviewExport("30d", "csv", [makeRow()]);
		expect(result.mimeType).toBe("text/csv;charset=utf-8");
		expect(result.filename).toMatch(/^avis-30d-\d{4}-\d{2}-\d{2}\.csv$/);
		expect(result.rowCount).toBe(1);
	});

	it("produces a JSON payload with correct mime type and filename", () => {
		const result = buildReviewExport("year", "json", [makeRow()]);
		expect(result.mimeType).toBe("application/json;charset=utf-8");
		expect(result.filename).toMatch(/^avis-year-\d{4}-\d{2}-\d{2}\.json$/);
	});

	it("includes header metadata and row count in CSV", () => {
		const result = buildReviewExport("7d", "csv", [makeRow(), makeRow({ id: "b" })]);
		expect(result.content).toContain("# Export avis Synclune");
		expect(result.content).toContain("# Periode: 7 derniers jours");
		expect(result.content).toContain("# Total: 2");
	});

	it("CSV includes all expected columns in header row", () => {
		const result = buildReviewExport("all", "csv", [makeRow()]);
		const headerLine = result.content.split("\n").find((line) => line.startsWith("ID,"));
		expect(headerLine).toContain("Note");
		expect(headerLine).toContain("Numero de commande");
		expect(headerLine).toContain("Demande avis envoyee");
		expect(headerLine).toContain("Rappel avis envoye");
		expect(headerLine).toContain("Reponse admin");
		expect(headerLine).toContain("Nombre de photos");
	});

	it("escapes content containing commas and newlines in CSV", () => {
		const row = makeRow({
			content: "Super, vraiment.\nEt encore mieux",
			title: 'Avis "coup de coeur"',
		});
		const result = buildReviewExport("30d", "csv", [row]);
		expect(result.content).toContain('"Avis ""coup de coeur"""');
		expect(result.content).toContain('"Super, vraiment.\nEt encore mieux"');
	});

	it("omits soft-deleted responses from CSV output", () => {
		const row = makeRow({
			response: {
				content: "Merci",
				authorName: "Admin",
				createdAt: new Date(),
				deletedAt: new Date(),
			},
		});
		const result = buildReviewExport("30d", "csv", [row]);
		expect(result.content).not.toContain("Merci");
	});

	it("includes active admin response content in CSV", () => {
		const row = makeRow({
			response: {
				content: "Merci pour votre retour",
				authorName: "Admin Synclune",
				createdAt: new Date("2026-04-12T08:00:00Z"),
				deletedAt: null,
			},
		});
		const result = buildReviewExport("30d", "csv", [row]);
		expect(result.content).toContain("Merci pour votre retour");
		expect(result.content).toContain("Admin Synclune");
	});

	it("JSON payload is valid and contains review data", () => {
		const result = buildReviewExport("30d", "json", [makeRow()]);
		const parsed = JSON.parse(result.content);
		expect(parsed.period).toBe("30d");
		expect(parsed.total).toBe(1);
		expect(parsed.reviews).toHaveLength(1);
		expect(parsed.reviews[0].orderNumber).toBe("ORD-2026-00042");
		expect(parsed.reviews[0].mediaCount).toBe(2);
	});

	it("JSON strips soft-deleted response", () => {
		const row = makeRow({
			response: {
				content: "Merci",
				authorName: "Admin",
				createdAt: new Date(),
				deletedAt: new Date(),
			},
		});
		const result = buildReviewExport("30d", "json", [row]);
		const parsed = JSON.parse(result.content);
		expect(parsed.reviews[0].response).toBeNull();
	});

	it("JSON exposes active admin response", () => {
		const row = makeRow({
			response: {
				content: "Merci",
				authorName: "Admin",
				createdAt: new Date("2026-04-12T08:00:00Z"),
				deletedAt: null,
			},
		});
		const result = buildReviewExport("30d", "json", [row]);
		const parsed = JSON.parse(result.content);
		expect(parsed.reviews[0].response.content).toBe("Merci");
	});

	it("handles empty rows gracefully", () => {
		const csv = buildReviewExport("7d", "csv", []);
		expect(csv.rowCount).toBe(0);
		expect(csv.content).toContain("# Total: 0");

		const json = buildReviewExport("7d", "json", []);
		const parsed = JSON.parse(json.content);
		expect(parsed.total).toBe(0);
		expect(parsed.reviews).toEqual([]);
	});

	it("handles rows without user (anonymized) or product (archived)", () => {
		const row = makeRow({ user: null, product: null });
		const csv = buildReviewExport("30d", "csv", [row]);
		expect(csv.content).toBeTruthy();
		const json = buildReviewExport("30d", "json", [row]);
		const parsed = JSON.parse(json.content);
		expect(parsed.reviews[0].user).toBeNull();
		expect(parsed.reviews[0].product).toBeNull();
	});
});
