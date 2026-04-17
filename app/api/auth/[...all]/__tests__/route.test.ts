import { describe, it, expect, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockHandler, mockToNextJsHandler } = vi.hoisted(() => ({
	mockHandler: vi.fn(),
	mockToNextJsHandler: vi.fn((handler: (req: Request) => Promise<Response>) => ({
		GET: handler,
		POST: handler,
	})),
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: { handler: mockHandler },
}));

vi.mock("better-auth/next-js", () => ({
	toNextJsHandler: mockToNextJsHandler,
}));

import { GET, POST } from "../route";

// ============================================================================
// Tests
// ============================================================================

describe("Better Auth catch-all route", () => {
	it("delegates GET to auth.handler via toNextJsHandler", async () => {
		const expected = new Response("ok", { status: 200 });
		mockHandler.mockResolvedValue(expected);

		const req = new Request("https://example.com/api/auth/session");
		const res = await GET(req);

		expect(mockHandler).toHaveBeenCalledWith(req);
		expect(res).toBe(expected);
	});

	it("delegates POST to auth.handler via toNextJsHandler", async () => {
		const expected = new Response(JSON.stringify({ user: null }), { status: 200 });
		mockHandler.mockResolvedValue(expected);

		const req = new Request("https://example.com/api/auth/sign-in", {
			method: "POST",
			body: JSON.stringify({ email: "test@example.com" }),
		});
		const res = await POST(req);

		expect(mockHandler).toHaveBeenCalledWith(req);
		expect(res).toBe(expected);
	});

	it("invokes toNextJsHandler exactly once at module load", () => {
		expect(mockToNextJsHandler).toHaveBeenCalledTimes(1);
		expect(mockToNextJsHandler).toHaveBeenCalledWith(mockHandler);
	});

	it("propagates handler rejections", async () => {
		mockHandler.mockRejectedValue(new Error("auth-fail"));

		const req = new Request("https://example.com/api/auth/sign-in", { method: "POST" });

		await expect(POST(req)).rejects.toThrow("auth-fail");
	});
});
