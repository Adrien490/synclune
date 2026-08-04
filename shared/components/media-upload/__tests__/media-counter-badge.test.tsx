import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCounterBadge } = vi.hoisted(() => ({
	mockCounterBadge: vi.fn(),
}));

vi.mock("@/shared/components/ui/counter-badge", () => ({
	CounterBadge: (props: {
		count: number;
		max: number;
		label: string;
		icon: unknown;
		className?: string;
	}) => {
		mockCounterBadge(props);
		return (
			<div
				data-testid="counter-badge"
				data-count={props.count}
				data-max={props.max}
				data-label={props.label}
				className={props.className}
			/>
		);
	},
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ImagesIcon: () => <svg data-testid="icon-images" />,
}));

// Import AFTER mocks
import { MediaCounterBadge } from "../media-counter-badge";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MediaCounterBadge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders CounterBadge with the given count", () => {
		render(<MediaCounterBadge count={3} max={10} />);
		expect(screen.getByTestId("counter-badge")).toHaveAttribute("data-count", "3");
	});

	it("passes max to CounterBadge", () => {
		render(<MediaCounterBadge count={5} max={8} />);
		expect(screen.getByTestId("counter-badge")).toHaveAttribute("data-max", "8");
	});

	it("passes label='médias' to CounterBadge", () => {
		render(<MediaCounterBadge count={1} max={5} />);
		expect(mockCounterBadge).toHaveBeenCalledWith(expect.objectContaining({ label: "médias" }));
	});

	it("passes the Images icon to CounterBadge", () => {
		render(<MediaCounterBadge count={1} max={5} />);
		const call = mockCounterBadge.mock.calls[0]?.[0];
		expect(call?.icon).toBeDefined();
	});

	it("forwards className to CounterBadge", () => {
		render(<MediaCounterBadge count={1} max={5} className="custom-class" />);
		expect(screen.getByTestId("counter-badge")).toHaveClass("custom-class");
	});

	it("renders without className when not provided", () => {
		render(<MediaCounterBadge count={2} max={6} />);
		expect(screen.getByTestId("counter-badge")).toBeInTheDocument();
	});
});
