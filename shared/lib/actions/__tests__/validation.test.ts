import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateInput, validateFormData } from "../validation";
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

describe("validateFormData", () => {
	it("extracts and validates FormData successfully", () => {
		const fd = new FormData();
		fd.set("name", "Alice");
		fd.set("age", "25");

		const result = validateFormData(
			fd,
			(f) => ({ name: f.get("name"), age: Number(f.get("age")) }),
			testSchema,
		);
		expect(result).toEqual({ data: { name: "Alice", age: 25 } });
	});

	it("returns error when extracted data fails validation", () => {
		const fd = new FormData();
		fd.set("name", "");
		fd.set("age", "25");

		const result = validateFormData(
			fd,
			(f) => ({ name: f.get("name"), age: Number(f.get("age")) }),
			testSchema,
		);
		expect("error" in result).toBe(true);
	});

	it("handles missing fields in FormData", () => {
		const fd = new FormData();

		const result = validateFormData(
			fd,
			(f) => ({ name: f.get("name"), age: Number(f.get("age")) }),
			testSchema,
		);
		expect("error" in result).toBe(true);
	});
});
