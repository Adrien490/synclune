import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	TooltipContent: ({ children, side }: { children: React.ReactNode; side?: string }) => (
		<div data-testid="tooltip-content" data-side={side}>
			{children}
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	MessageSquare: ({ className }: { className?: string }) => (
		<svg data-testid="message-icon" className={className} aria-hidden="true" />
	),
}));

import { AdminSpeedDial } from "../admin-speed-dial";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AdminSpeedDial", () => {
	it("renders a mailto link with the provided email", () => {
		render(<AdminSpeedDial email="adrien@example.com" />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "mailto:adrien@example.com");
	});

	it("has an accessible aria-label", () => {
		render(<AdminSpeedDial email="adrien@example.com" />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("aria-label", "Envoyer un email à Adrien");
	});

	it("renders the message icon with aria-hidden", () => {
		render(<AdminSpeedDial email="adrien@example.com" />);

		const icon = screen.getByTestId("message-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("renders tooltip content", () => {
		render(<AdminSpeedDial email="adrien@example.com" />);

		expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
		expect(screen.getByText("Contacter Adri")).toBeInTheDocument();
		expect(screen.getByText("Bug, feature ou question")).toBeInTheDocument();
	});

	it("positions tooltip to the left", () => {
		render(<AdminSpeedDial email="adrien@example.com" />);

		expect(screen.getByTestId("tooltip-content")).toHaveAttribute("data-side", "left");
	});
});
