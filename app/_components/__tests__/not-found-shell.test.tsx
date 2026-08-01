import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAddBreadcrumb, mockTrackEvent } = vi.hoisted(() => ({
	mockAddBreadcrumb: vi.fn(),
	mockTrackEvent: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	addBreadcrumb: mockAddBreadcrumb,
}));

vi.mock("@/shared/lib/analytics/track", () => ({
	trackEvent: mockTrackEvent,
}));

import { NotFoundShell } from "../not-found-shell";

describe("NotFoundShell", () => {
	beforeEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { pathname: "/url-inexistante" },
		});
		Object.defineProperty(document, "referrer", {
			configurable: true,
			value: "https://synclune.fr/produits",
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders children inside a main with safe-area padding", () => {
		render(
			<NotFoundShell>
				<p data-testid="child">content</p>
			</NotFoundShell>,
		);
		const main = screen.getByRole("main");
		expect(main).toBeInTheDocument();
		expect(main.className).toContain("min-h-dvh");
		expect(main.className).toContain("safe-area-inset-bottom");
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("emits Sentry breadcrumb and Analytics event with default 404 code", () => {
		render(
			<NotFoundShell>
				<p>x</p>
			</NotFoundShell>,
		);
		expect(mockAddBreadcrumb).toHaveBeenCalledWith({
			category: "navigation",
			message: "error_page_404",
			level: "info",
			data: { path: "/url-inexistante", referrer: "https://synclune.fr/produits" },
		});
		expect(mockTrackEvent).toHaveBeenCalledWith("error_page_404", {
			path: "/url-inexistante",
			referrer: "https://synclune.fr/produits",
		});
	});

	it("uses errorCode prop in event names (403)", () => {
		render(
			<NotFoundShell errorCode="403">
				<p>x</p>
			</NotFoundShell>,
		);
		expect(mockAddBreadcrumb).toHaveBeenCalledWith(
			expect.objectContaining({ message: "error_page_403" }),
		);
		expect(mockTrackEvent).toHaveBeenCalledWith("error_page_403", expect.any(Object));
	});

	it("uses errorCode prop in event names (401)", () => {
		render(
			<NotFoundShell errorCode="401">
				<p>x</p>
			</NotFoundShell>,
		);
		expect(mockAddBreadcrumb).toHaveBeenCalledWith(
			expect.objectContaining({ message: "error_page_401" }),
		);
		expect(mockTrackEvent).toHaveBeenCalledWith("error_page_401", expect.any(Object));
	});

	it("passes null referrer when document.referrer is empty", () => {
		Object.defineProperty(document, "referrer", { configurable: true, value: "" });
		render(
			<NotFoundShell>
				<p>x</p>
			</NotFoundShell>,
		);
		expect(mockTrackEvent).toHaveBeenCalledWith("error_page_404", {
			path: "/url-inexistante",
			referrer: null,
		});
	});
});
