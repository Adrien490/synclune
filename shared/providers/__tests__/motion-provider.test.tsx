import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.3 },
		easing: { easeOut: [0, 0, 0.2, 1] },
	},
}));

vi.mock("motion/react", () => ({
	LazyMotion: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="lazy-motion">{children}</div>
	),
	MotionConfig: ({
		children,
		reducedMotion,
	}: {
		children: React.ReactNode;
		reducedMotion?: string;
		transition?: object;
	}) => (
		<div data-testid="motion-config" data-reduced-motion={reducedMotion}>
			{children}
		</div>
	),
	domMax: {},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { MotionProvider } from "../motion-provider";

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("MotionProvider", () => {
	it("renders children inside LazyMotion and MotionConfig", () => {
		render(
			<MotionProvider>
				<div data-testid="child">Content</div>
			</MotionProvider>,
		);

		expect(screen.getByTestId("lazy-motion")).toBeInTheDocument();
		expect(screen.getByTestId("motion-config")).toBeInTheDocument();
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders children as descendant of both providers", () => {
		render(
			<MotionProvider>
				<span>test content</span>
			</MotionProvider>,
		);

		expect(screen.getByTestId("lazy-motion").textContent).toContain("test content");
		expect(screen.getByTestId("motion-config").textContent).toContain("test content");
	});
});
