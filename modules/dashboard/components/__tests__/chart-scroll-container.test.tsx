import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ChartScrollContainer } from "../chart-scroll-container";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ChartScrollContainer", () => {
	it("renders children", () => {
		render(
			<ChartScrollContainer>
				<div data-testid="child">contenu</div>
			</ChartScrollContainer>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("applies additional className", () => {
		const { container } = render(
			<ChartScrollContainer className="custom-class">
				<span>contenu</span>
			</ChartScrollContainer>,
		);

		const outer = container.firstElementChild;
		expect(outer?.className).toContain("custom-class");
	});

	it("renders without extra className by default", () => {
		const { container } = render(
			<ChartScrollContainer>
				<span>contenu</span>
			</ChartScrollContainer>,
		);

		const outer = container.firstElementChild;
		// Should not contain undefined or null as class
		expect(outer?.className).not.toContain("undefined");
		expect(outer?.className).not.toContain("null");
	});

	it("wraps children in an inner div", () => {
		const { container } = render(
			<ChartScrollContainer>
				<span data-testid="child">contenu</span>
			</ChartScrollContainer>,
		);

		// Outer > inner > child
		const outer = container.firstElementChild;
		const inner = outer?.firstElementChild;
		expect(inner?.querySelector("[data-testid='child']")).toBeInTheDocument();
	});
});
