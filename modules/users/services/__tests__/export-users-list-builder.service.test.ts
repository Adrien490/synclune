import { describe, it, expect } from "vitest";
import {
	buildUsersListExport,
	escapeCsvCell,
	type ExportUserRow,
} from "../export-users-list-builder.service";

function makeUser(overrides: Partial<ExportUserRow> = {}): ExportUserRow {
	return {
		id: "u1",
		email: "alice@example.com",
		name: "Alice",
		role: "USER",
		accountStatus: "ACTIVE",
		createdAt: new Date("2026-03-01T00:00:00Z"),
		emailVerified: true,
		ordersCount: 2,
		totalSpent: 150.5,
		...overrides,
	};
}

describe("escapeCsvCell", () => {
	it("returns empty string for null/undefined", () => {
		expect(escapeCsvCell(null)).toBe("");
		expect(escapeCsvCell(undefined)).toBe("");
	});

	it("leaves simple values unquoted", () => {
		expect(escapeCsvCell("hello")).toBe("hello");
		expect(escapeCsvCell(42)).toBe("42");
		expect(escapeCsvCell(true)).toBe("true");
	});

	it("quotes values containing commas", () => {
		expect(escapeCsvCell("a,b")).toBe('"a,b"');
	});

	it("quotes values with internal quotes and doubles them (RFC 4180)", () => {
		expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
	});

	it("quotes values containing newlines", () => {
		expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
	});

	it("quotes values with leading/trailing whitespace", () => {
		expect(escapeCsvCell(" leading")).toBe('" leading"');
		expect(escapeCsvCell("trailing ")).toBe('"trailing "');
	});
});

describe("buildUsersListExport - CSV", () => {
	it("produces a CSV with UTF-8 BOM", () => {
		const result = buildUsersListExport("csv", [makeUser()]);
		expect(result.content.startsWith("\uFEFF")).toBe(true);
	});

	it("uses .csv extension and text/csv mime type", () => {
		const result = buildUsersListExport("csv", [makeUser()]);
		expect(result.filename).toMatch(/users-\d{4}-\d{2}-\d{2}\.csv/);
		expect(result.mimeType).toBe("text/csv;charset=utf-8");
	});

	it("includes header row with French labels", () => {
		const result = buildUsersListExport("csv", [makeUser()]);
		expect(result.content).toContain("Email");
		expect(result.content).toContain("Nom");
		expect(result.content).toContain("Role");
		expect(result.content).toContain("Statut compte");
		expect(result.content).toContain("Email verifie");
		expect(result.content).toContain("Nombre de commandes");
		expect(result.content).toContain("Total depense (EUR)");
	});

	it("serializes users with computed total as 2-decimal number", () => {
		const result = buildUsersListExport("csv", [
			makeUser({ totalSpent: 123.4567, ordersCount: 5 }),
		]);
		expect(result.content).toContain("123.46");
		expect(result.content).toContain(",5,");
	});

	it("renders empty name as empty cell", () => {
		const result = buildUsersListExport("csv", [makeUser({ name: null })]);
		const lines = result.content.split("\n");
		const dataLine = lines[lines.length - 1];
		expect(dataLine).toContain(",,"); // empty name between email and role
	});

	it("escapes commas in names", () => {
		const result = buildUsersListExport("csv", [makeUser({ name: "Doe, John" })]);
		expect(result.content).toContain('"Doe, John"');
	});

	it("renders emailVerified as oui/non", () => {
		const yes = buildUsersListExport("csv", [makeUser({ emailVerified: true })]);
		expect(yes.content).toContain(",oui,");

		const no = buildUsersListExport("csv", [makeUser({ emailVerified: false })]);
		expect(no.content).toContain(",non,");
	});

	it("includes generated-at and total metadata", () => {
		const result = buildUsersListExport("csv", [makeUser(), makeUser({ id: "u2" })]);
		expect(result.content).toContain("# Total: 2");
		expect(result.content).toMatch(/# Genere: \d{4}/);
	});
});

describe("buildUsersListExport - JSON", () => {
	it("uses .json extension and application/json mime type", () => {
		const result = buildUsersListExport("json", [makeUser()]);
		expect(result.filename).toMatch(/users-\d{4}-\d{2}-\d{2}\.json/);
		expect(result.mimeType).toBe("application/json;charset=utf-8");
	});

	it("produces parseable JSON with expected shape", () => {
		const users = [makeUser(), makeUser({ id: "u2", email: "bob@example.com" })];
		const result = buildUsersListExport("json", users);

		const parsed = JSON.parse(result.content) as {
			generatedAt: string;
			total: number;
			users: Array<{ id: string; email: string }>;
		};

		expect(parsed.total).toBe(2);
		expect(parsed.users).toHaveLength(2);
		expect(parsed.users[0]!.id).toBe("u1");
		expect(parsed.users[1]!.email).toBe("bob@example.com");
		expect(typeof parsed.generatedAt).toBe("string");
	});

	it("serializes createdAt as ISO string", () => {
		const d = new Date("2026-04-17T10:30:00Z");
		const result = buildUsersListExport("json", [makeUser({ createdAt: d })]);
		const parsed = JSON.parse(result.content) as { users: Array<{ createdAt: string }> };
		expect(parsed.users[0]!.createdAt).toBe("2026-04-17T10:30:00.000Z");
	});
});
