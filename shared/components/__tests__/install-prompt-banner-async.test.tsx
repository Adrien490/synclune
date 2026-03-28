import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetInstallPromptState, mockInstallPromptBanner } = vi.hoisted(() => ({
	mockGetInstallPromptState: vi.fn(),
	mockInstallPromptBanner: vi.fn(),
}));

vi.mock("@/shared/data/get-install-prompt-state", () => ({
	getInstallPromptState: mockGetInstallPromptState,
}));

vi.mock("@/shared/components/install-prompt-banner", () => ({
	InstallPromptBanner: (props: { initialState: unknown }) => {
		mockInstallPromptBanner(props);
		return (
			<div data-testid="install-prompt-banner" data-state={JSON.stringify(props.initialState)} />
		);
	},
}));

// Import AFTER mocks
import { InstallPromptBannerAsync } from "../install-prompt-banner-async";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("InstallPromptBannerAsync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders InstallPromptBanner with the state from getInstallPromptState", async () => {
		mockGetInstallPromptState.mockResolvedValue({ dismissed: false });
		const element = await InstallPromptBannerAsync();
		const { unmount } = render(element);
		expect(screen.getByTestId("install-prompt-banner")).toBeInTheDocument();
		expect(mockInstallPromptBanner).toHaveBeenCalledWith({ initialState: { dismissed: false } });
		unmount();
	});

	it("passes dismissed=true state when user dismissed the banner", async () => {
		mockGetInstallPromptState.mockResolvedValue({ dismissed: true });
		const element = await InstallPromptBannerAsync();
		const { unmount } = render(element);
		expect(mockInstallPromptBanner).toHaveBeenCalledWith({ initialState: { dismissed: true } });
		unmount();
	});

	it("calls getInstallPromptState exactly once", async () => {
		mockGetInstallPromptState.mockResolvedValue(null);
		await InstallPromptBannerAsync();
		expect(mockGetInstallPromptState).toHaveBeenCalledTimes(1);
	});
});
