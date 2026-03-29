import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { requireScriptEnvVars } from "../script-env";

describe("requireScriptEnvVars", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns required env vars when all are defined", () => {
		process.env.DATABASE_URL = "postgres://localhost";
		process.env.API_KEY = "secret";

		const env = requireScriptEnvVars(["DATABASE_URL", "API_KEY"] as const, "test-script");

		expect(env.DATABASE_URL).toBe("postgres://localhost");
		expect(env.API_KEY).toBe("secret");
	});

	it("calls process.exit(1) when env vars are missing", () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

		delete process.env.MISSING_VAR;

		requireScriptEnvVars(["MISSING_VAR"] as const, "test-script");

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("test-script"));

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	it("lists all missing vars in error output", () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

		delete process.env.VAR_A;
		delete process.env.VAR_B;

		requireScriptEnvVars(["VAR_A", "VAR_B"] as const, "my-script");

		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("VAR_A"));
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("VAR_B"));

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	it("treats empty string as missing", () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		vi.spyOn(console, "error").mockImplementation(() => {});

		process.env.EMPTY = "";

		requireScriptEnvVars(["EMPTY"] as const, "test");

		expect(mockExit).toHaveBeenCalledWith(1);

		vi.restoreAllMocks();
	});

	it("returns empty object for empty keys array", () => {
		const env = requireScriptEnvVars([] as const, "test");
		expect(env).toEqual({});
	});
});
