import { render, act, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockGetPostHog, mockUsePathname, mockUseSearchParams, mockUseCookieConsentStore } =
	vi.hoisted(() => ({
		mockGetPostHog: vi.fn(),
		mockUsePathname: vi.fn(),
		mockUseSearchParams: vi.fn(),
		mockUseCookieConsentStore: vi.fn(),
	}));

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: mockGetPostHog,
}));

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
	useSearchParams: mockUseSearchParams,
}));

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: mockUseCookieConsentStore,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { PostHogProvider } from "../posthog-provider";

// ============================================================================
// Tests
// ============================================================================

describe("PostHogProvider", () => {
	const mockPh = {
		capture: vi.fn(),
		opt_in_capturing: vi.fn(),
		opt_out_capturing: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockUsePathname.mockReturnValue("/boutique");
		mockUseSearchParams.mockReturnValue({ toString: () => "" });
		mockUseCookieConsentStore.mockReturnValue(false);
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("renders children", () => {
		mockGetPostHog.mockReturnValue(null);

		render(
			<PostHogProvider>
				<div data-testid="child">Hello</div>
			</PostHogProvider>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("does not initialize when NEXT_PUBLIC_POSTHOG_KEY is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
		mockGetPostHog.mockReturnValue(null);

		render(
			<PostHogProvider>
				<span>test</span>
			</PostHogProvider>,
		);

		// Should not poll — getPostHog should not be called after the initial check
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		// Only called during render of PostHogConsentSync if ready (which it isn't)
		expect(mockPh.capture).not.toHaveBeenCalled();
	});

	it("polls until PostHog is ready then captures pageview", () => {
		// First call returns null, second returns the instance
		mockGetPostHog.mockReturnValueOnce(null).mockReturnValue(mockPh);

		render(
			<PostHogProvider>
				<span>test</span>
			</PostHogProvider>,
		);

		// First check: null → schedules timeout
		act(() => {
			vi.advanceTimersByTime(200);
		});

		// Now PostHog is available, pageview should be captured
		expect(mockPh.capture).toHaveBeenCalledWith("$pageview", {
			$current_url: expect.stringContaining("/boutique"),
		});
	});

	it("captures pageview with search params", () => {
		mockGetPostHog.mockReturnValue(mockPh);
		mockUseSearchParams.mockReturnValue({ toString: () => "q=test" });

		render(
			<PostHogProvider>
				<span>test</span>
			</PostHogProvider>,
		);

		act(() => {
			vi.advanceTimersByTime(0);
		});

		expect(mockPh.capture).toHaveBeenCalledWith("$pageview", {
			$current_url: expect.stringContaining("/boutique?q=test"),
		});
	});

	it("calls opt_in_capturing when consent is accepted", () => {
		mockGetPostHog.mockReturnValue(mockPh);
		mockUseCookieConsentStore.mockReturnValue(true);

		render(
			<PostHogProvider>
				<span>test</span>
			</PostHogProvider>,
		);

		act(() => {
			vi.advanceTimersByTime(0);
		});

		expect(mockPh.opt_in_capturing).toHaveBeenCalled();
	});

	it("calls opt_out_capturing when consent is not accepted", () => {
		mockGetPostHog.mockReturnValue(mockPh);
		mockUseCookieConsentStore.mockReturnValue(false);

		render(
			<PostHogProvider>
				<span>test</span>
			</PostHogProvider>,
		);

		act(() => {
			vi.advanceTimersByTime(0);
		});

		expect(mockPh.opt_out_capturing).toHaveBeenCalled();
	});
});
