import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

const { sentinelRouterConfig } = vi.hoisted(() => ({
	sentinelRouterConfig: { __sentinel: "router-config-ok" },
}));

vi.mock("@/app/api/uploadthing/core", () => ({
	ourFileRouter: { __sentinel: "file-router" },
}));

vi.mock("uploadthing/server", () => ({
	extractRouterConfig: vi.fn(() => sentinelRouterConfig),
}));

vi.mock("@uploadthing/react/next-ssr-plugin", () => ({
	NextSSRPlugin: ({ routerConfig }: { routerConfig: unknown }) => (
		<div data-testid="uploadthing-ssr-plugin" data-config={JSON.stringify(routerConfig)} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { UploadThingSSR } from "../uploadthing-ssr";
import { extractRouterConfig } from "uploadthing/server";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("UploadThingSSR", () => {
	it("renders the NextSSRPlugin", () => {
		render(<UploadThingSSR />);
		expect(screen.getByTestId("uploadthing-ssr-plugin")).toBeInTheDocument();
	});

	it("forwards the router config extracted from ourFileRouter", () => {
		render(<UploadThingSSR />);
		const node = screen.getByTestId("uploadthing-ssr-plugin");
		expect(JSON.parse(node.getAttribute("data-config") ?? "null")).toEqual(sentinelRouterConfig);
	});

	it("calls extractRouterConfig at module import time", () => {
		// The module is imported at the top of the file, so extractRouterConfig
		// should have been invoked already (module-level const).
		expect(extractRouterConfig).toHaveBeenCalled();
	});
});
