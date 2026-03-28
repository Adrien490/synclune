import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseReducedMotion } = vi.hoisted(() => ({
	mockUseReducedMotion: vi.fn(),
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({
			children,
			initial: _initial,
			animate: _animate,
			transition: _transition,
			...rest
		}: React.ComponentProps<"div"> & {
			initial?: unknown;
			animate?: unknown;
			transition?: unknown;
		}) => (
			<div data-testid="motion-div" {...rest}>
				{children}
			</div>
		),
	},
	useReducedMotion: mockUseReducedMotion,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { emphasis: 0.4 },
		easing: { easeOut: [0, 0, 0.2, 1] },
	},
	maybeReduceMotion: vi.fn((t: unknown) => t),
}));

vi.mock("@/shared/components/logo", () => ({
	Logo: (props: Record<string, unknown>) => <div data-testid="logo" {...props} />,
}));

// Import AFTER mocks
import { LogoAnimated } from "../logo-animated";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("LogoAnimated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseReducedMotion.mockReturnValue(false);
	});

	it("renders the Logo component inside a motion div", () => {
		render(<LogoAnimated />);
		expect(screen.getByTestId("logo")).toBeInTheDocument();
		expect(screen.getByTestId("motion-div")).toBeInTheDocument();
	});

	it("forwards props to the Logo component", () => {
		render(<LogoAnimated className="my-logo" />);
		expect(screen.getByTestId("logo")).toHaveAttribute("class", "my-logo");
	});

	it("renders correctly when reduced motion is preferred", () => {
		mockUseReducedMotion.mockReturnValue(true);
		render(<LogoAnimated />);
		expect(screen.getByTestId("logo")).toBeInTheDocument();
	});

	it("renders correctly when reduced motion is not preferred", () => {
		mockUseReducedMotion.mockReturnValue(false);
		render(<LogoAnimated />);
		expect(screen.getByTestId("motion-div")).toBeInTheDocument();
	});
});
