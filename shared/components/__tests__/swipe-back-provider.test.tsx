import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRouterBack, mockUseEdgeSwipe, mockTriggerHaptic } = vi.hoisted(() => ({
	mockRouterBack: vi.fn(),
	mockUseEdgeSwipe: vi.fn(),
	mockTriggerHaptic: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: mockRouterBack }),
}));

vi.mock("@/shared/hooks/use-edge-swipe", () => ({
	useEdgeSwipe: mockUseEdgeSwipe,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

let matchMediaMatches = false;
const mqListeners: Array<(e: MediaQueryListEvent) => void> = [];
const matchMediaMock = vi.fn((query: string) => ({
	get matches() {
		return matchMediaMatches;
	},
	media: query,
	addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
		mqListeners.push(cb);
	}),
	removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
		const idx = mqListeners.indexOf(cb);
		if (idx >= 0) mqListeners.splice(idx, 1);
	}),
	dispatchEvent: vi.fn(),
	addListener: vi.fn(),
	removeListener: vi.fn(),
	onchange: null,
}));

beforeEach(() => {
	vi.clearAllMocks();
	matchMediaMatches = false;
	mqListeners.length = 0;
	vi.stubGlobal("matchMedia", matchMediaMock);
});

afterEach(cleanup);

import { SwipeBackProvider } from "../swipe-back-provider";

describe("SwipeBackProvider", () => {
	it("renders nothing (returns null)", () => {
		const { container } = render(<SwipeBackProvider />);
		expect(container.firstChild).toBeNull();
	});

	it("registers a standalone display-mode media query", () => {
		render(<SwipeBackProvider />);
		expect(matchMediaMock).toHaveBeenCalledWith("(display-mode: standalone)");
	});

	it("disables useEdgeSwipe when not standalone (isOpen=true)", () => {
		matchMediaMatches = false;
		render(<SwipeBackProvider />);
		const [, isOpen] = mockUseEdgeSwipe.mock.calls[0] ?? [];
		expect(isOpen).toBe(true);
	});

	it("enables useEdgeSwipe when standalone (isOpen=false)", () => {
		matchMediaMatches = true;
		render(<SwipeBackProvider />);
		const [, isOpen] = mockUseEdgeSwipe.mock.calls[0] ?? [];
		expect(isOpen).toBe(false);
	});

	it("calls router.back() and triggers light haptic when onOpen fires", () => {
		matchMediaMatches = true;
		render(<SwipeBackProvider />);
		const [onOpen] = mockUseEdgeSwipe.mock.calls[0] ?? [];
		onOpen?.();
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
		expect(mockRouterBack).toHaveBeenCalledOnce();
	});
});
