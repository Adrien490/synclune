import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children, className }: any) => (
		<div data-testid="fade" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: {
			emphasis: 0.4,
		},
	},
}));

import { AuthFadeIn } from "../auth-fade-in";

// ============================================================================
// TESTS
// ============================================================================

describe("AuthFadeIn", () => {
	afterEach(cleanup);

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render children", () => {
		render(
			<AuthFadeIn>
				<p>Contenu animé</p>
			</AuthFadeIn>,
		);

		expect(screen.getByText("Contenu animé")).toBeInTheDocument();
	});

	it("should pass className to Fade wrapper", () => {
		render(
			<AuthFadeIn className="custom-class">
				<p>Contenu</p>
			</AuthFadeIn>,
		);

		expect(screen.getByTestId("fade")).toHaveClass("custom-class");
	});

	it("should render without crashing with default props", () => {
		render(
			<AuthFadeIn>
				<span>Default</span>
			</AuthFadeIn>,
		);

		expect(screen.getByTestId("fade")).toBeInTheDocument();
	});
});
