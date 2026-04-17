import type { NextRequest } from "next/server";
import { describe, it, expect, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateRouteHandler, mockOurFileRouter } = vi.hoisted(() => ({
	mockCreateRouteHandler: vi.fn((_opts: { router: unknown; config: { logLevel: string } }) => ({
		GET: vi.fn(async () => new Response("get-ok", { status: 200 })),
		POST: vi.fn(async () => new Response("post-ok", { status: 200 })),
	})),
	mockOurFileRouter: { sample: { input: {} } },
}));

vi.mock("uploadthing/next", () => ({
	createRouteHandler: mockCreateRouteHandler,
}));

vi.mock("../core", () => ({
	ourFileRouter: mockOurFileRouter,
}));

import { GET, POST } from "../route";

// ============================================================================
// Tests
// ============================================================================

describe("UploadThing route handler", () => {
	it("creates the route handler exactly once at module load", () => {
		expect(mockCreateRouteHandler).toHaveBeenCalledTimes(1);
	});

	it("passes the file router to createRouteHandler", () => {
		expect(mockCreateRouteHandler).toHaveBeenCalledWith(
			expect.objectContaining({ router: mockOurFileRouter }),
		);
	});

	it("configures logLevel based on NODE_ENV", () => {
		const args = mockCreateRouteHandler.mock.calls[0]![0];
		expect(args.config.logLevel).toMatch(/Debug|Error/);
	});

	it("exports GET handler", async () => {
		expect(typeof GET).toBe("function");
		const res = await GET(
			new Request("http://localhost/api/uploadthing") as unknown as NextRequest,
		);
		expect(res.status).toBe(200);
	});

	it("exports POST handler", async () => {
		expect(typeof POST).toBe("function");
		const res = await POST(
			new Request("http://localhost/api/uploadthing", { method: "POST" }) as unknown as NextRequest,
		);
		expect(res.status).toBe(200);
	});
});
