import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { Progress } from "../progress";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Progress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with role=progressbar", () => {
		render(<Progress value={50} />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("has default aria-label='Progression'", () => {
		render(<Progress value={50} />);
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Progression");
	});

	it("uses custom aria-label when provided", () => {
		render(<Progress value={50} aria-label="Upload progress" />);
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Upload progress");
	});

	it("has data-slot=progress", () => {
		const { container } = render(<Progress value={50} />);
		expect(container.querySelector("[data-slot='progress']")).toBeInTheDocument();
	});

	it("renders the indicator with data-slot=progress-indicator", () => {
		const { container } = render(<Progress value={50} />);
		expect(container.querySelector("[data-slot='progress-indicator']")).toBeInTheDocument();
	});

	it("sets indicator translateX to -50% when value=50", () => {
		const { container } = render(<Progress value={50} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator?.style.transform).toBe("translateX(-50%)");
	});

	it("sets indicator translateX to -100% when value=0", () => {
		const { container } = render(<Progress value={0} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator?.style.transform).toBe("translateX(-100%)");
	});

	it("sets indicator translateX to 0% when value=100", () => {
		const { container } = render(<Progress value={100} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator?.style.transform).toBe("translateX(-0%)");
	});

	it("handles undefined value (defaults to 0)", () => {
		const { container } = render(<Progress />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator?.style.transform).toBe("translateX(-100%)");
	});

	it("applies custom className", () => {
		render(<Progress value={50} className="my-progress" />);
		expect(screen.getByRole("progressbar")).toHaveClass("my-progress");
	});
});
