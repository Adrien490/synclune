import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSafeParse } = vi.hoisted(() => ({
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/schemas/env.schema", () => ({
	envSchema: {
		safeParse: mockSafeParse,
	},
}));

// ============================================================================
// Tests: validateEnv (via the env singleton)
// ============================================================================

describe("validateEnv", () => {
	beforeEach(() => {
		mockSafeParse.mockReset();
		vi.resetModules();
	});

	it("returns the parsed environment data when validation succeeds", async () => {
		const mockData = {
			DATABASE_URL: "postgresql://localhost:5432/test",
			NODE_ENV: "test",
			RESEND_API_KEY: "re_test_key",
		};

		mockSafeParse.mockReturnValue({ success: true, data: mockData });

		const { env } = await import("../env");

		expect(env).toEqual(mockData);
	});

	it("throws with the configuration error message when validation fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				flatten: () => ({
					fieldErrors: {
						DATABASE_URL: ["DATABASE_URL doit être une URL valide"],
					},
				}),
			},
		});

		await expect(import("../env")).rejects.toThrow(
			"Configuration invalide. Consultez les logs pour plus de détails.",
		);
	});

	it("logs each invalid field and its messages to console.error", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				flatten: () => ({
					fieldErrors: {
						RESEND_API_KEY: ["RESEND_API_KEY doit commencer par 're_'"],
						STRIPE_SECRET_KEY: ["Invalid input"],
					},
				}),
			},
		});

		await import("../env").catch(() => {});

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Variables d'environnement invalides"),
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("RESEND_API_KEY"));
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("RESEND_API_KEY doit commencer par 're_'"),
		);
		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("STRIPE_SECRET_KEY"));

		consoleErrorSpy.mockRestore();
	});

	it("logs a hint to check the .env file when validation fails", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				flatten: () => ({ fieldErrors: { DATABASE_URL: ["Required"] } }),
			},
		});

		await import("../env").catch(() => {});

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Vérifiez votre fichier .env"),
		);

		consoleErrorSpy.mockRestore();
	});

	it("calls safeParse with process.env", async () => {
		mockSafeParse.mockReturnValue({ success: true, data: { NODE_ENV: "test" } });

		await import("../env");

		expect(mockSafeParse).toHaveBeenCalledWith(process.env);
	});
});
