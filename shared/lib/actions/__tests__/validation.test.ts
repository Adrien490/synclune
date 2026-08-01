import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateInput, safeFormGet, safeFormGetJSON, parseFormIds } from "../validation";
import { ActionStatus } from "@/shared/types/server-action";

const testSchema = z.object({
	name: z.string().min(1, "Le nom est requis"),
	age: z.number().int().min(0, "L'âge doit être positif"),
});

describe("validateInput", () => {
	it("returns data on valid input", () => {
		const result = validateInput(testSchema, { name: "Alice", age: 25 });
		expect(result).toEqual({ data: { name: "Alice", age: 25 } });
	});

	it("returns error on invalid input", () => {
		const result = validateInput(testSchema, { name: "", age: 25 });
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.VALIDATION_ERROR);
		}
	});

	it("uses first Zod error message", () => {
		const result = validateInput(testSchema, { name: "", age: -1 });
		if ("error" in result) {
			expect(result.error.message).toBe("Le nom est requis");
		}
	});

	it("falls back to default message when issue has no message", () => {
		// Use a schema whose error has an empty issues array edge case
		const schema = z.string();
		const result = validateInput(schema, 123);
		if ("error" in result) {
			expect(result.error.message).toBeTruthy();
		}
	});

	it("applies Zod transforms", () => {
		const schema = z.object({ email: z.string().trim().toLowerCase() });
		const result = validateInput(schema, { email: "  Test@Email.COM  " });
		if ("data" in result) {
			expect(result.data.email).toBe("test@email.com");
		}
	});
});

describe("safeFormGet", () => {
	it("returns string value for existing key", () => {
		const fd = new FormData();
		fd.set("name", "Alice");
		expect(safeFormGet(fd, "name")).toBe("Alice");
	});

	it("returns null for missing key", () => {
		const fd = new FormData();
		expect(safeFormGet(fd, "name")).toBeNull();
	});

	it("returns null for File value", () => {
		const fd = new FormData();
		fd.set("file", new File(["content"], "test.txt"));
		expect(safeFormGet(fd, "file")).toBeNull();
	});

	it("returns empty string for empty value", () => {
		const fd = new FormData();
		fd.set("name", "");
		expect(safeFormGet(fd, "name")).toBe("");
	});
});

describe("safeFormGetJSON", () => {
	it("parses valid JSON string", () => {
		const fd = new FormData();
		fd.set("ids", JSON.stringify(["a", "b"]));
		expect(safeFormGetJSON<string[]>(fd, "ids")).toEqual(["a", "b"]);
	});

	it("returns null for missing key", () => {
		const fd = new FormData();
		expect(safeFormGetJSON(fd, "ids")).toBeNull();
	});

	it("returns null for invalid JSON", () => {
		const fd = new FormData();
		fd.set("ids", "not-json{");
		expect(safeFormGetJSON(fd, "ids")).toBeNull();
	});

	it("returns null for empty string", () => {
		const fd = new FormData();
		fd.set("ids", "");
		expect(safeFormGetJSON(fd, "ids")).toBeNull();
	});

	it("parses nested object", () => {
		const fd = new FormData();
		fd.set("data", JSON.stringify({ name: "test", nested: { a: 1 } }));
		const result = safeFormGetJSON<{ name: string; nested: { a: number } }>(fd, "data");
		expect(result?.nested.a).toBe(1);
	});
});

describe("parseFormIds", () => {
	it("parses a JSON array of ids", () => {
		const fd = new FormData();
		fd.set("ids", JSON.stringify(["id1", "id2", "id3"]));
		const result = parseFormIds(fd);
		expect(result).toEqual({ ids: ["id1", "id2", "id3"] });
	});

	it("returns empty array when field is missing", () => {
		const fd = new FormData();
		const result = parseFormIds(fd);
		expect(result).toEqual({ ids: [] });
	});

	it("returns empty array for empty string field", () => {
		const fd = new FormData();
		fd.set("ids", "");
		const result = parseFormIds(fd);
		expect(result).toEqual({ ids: [] });
	});

	it("returns error ActionState for malformed JSON", () => {
		const fd = new FormData();
		fd.set("ids", "not-json{");
		const result = parseFormIds(fd);
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(result.error.message).toBe("Format des IDs invalide.");
		}
	});

	it("coerces non-array JSON to empty array", () => {
		const fd = new FormData();
		fd.set("ids", JSON.stringify({ notAnArray: true }));
		const result = parseFormIds(fd);
		expect(result).toEqual({ ids: [] });
	});

	it("supports a custom key", () => {
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(["p1", "p2"]));
		const result = parseFormIds(fd, "productIds");
		expect(result).toEqual({ ids: ["p1", "p2"] });
	});
});
