import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		variant,
		size,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button onClick={onClick} data-variant={variant} data-size={size} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	AlertCircle: () => <svg data-testid="alert-icon" aria-hidden="true" />,
	RotateCcw: () => <svg data-testid="retry-icon" aria-hidden="true" />,
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "mock-card-class",
		padding: { card: "p-6" },
	},
}));

import { ChartError } from "../chart-error";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ChartError", () => {
	it("renders default title", () => {
		render(<ChartError />);

		expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
	});

	it("renders default description", () => {
		render(<ChartError />);

		expect(
			screen.getByText("Impossible de charger les donnees. Veuillez reessayer."),
		).toBeInTheDocument();
	});

	it("renders custom title", () => {
		render(<ChartError title="Erreur serveur" />);

		expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
	});

	it("renders custom description", () => {
		render(<ChartError description="Le service est temporairement indisponible." />);

		expect(screen.getByText("Le service est temporairement indisponible.")).toBeInTheDocument();
	});

	it("renders alert icon", () => {
		render(<ChartError />);

		expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Retry button
	// -------------------------------------------------------------------------

	describe("retry button", () => {
		it("renders retry button when onRetry is provided", () => {
			render(<ChartError onRetry={() => {}} />);

			expect(screen.getByText("Reessayer")).toBeInTheDocument();
		});

		it("does not render retry button when onRetry is not provided", () => {
			render(<ChartError />);

			expect(screen.queryByText("Reessayer")).toBeNull();
		});

		it("calls onRetry when retry button is clicked", async () => {
			const user = userEvent.setup();
			const onRetry = vi.fn();

			render(<ChartError onRetry={onRetry} />);

			await user.click(screen.getByText("Reessayer"));

			expect(onRetry).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	describe("accessibility", () => {
		it("has role=alert", () => {
			render(<ChartError />);

			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		it("has aria-live=polite", () => {
			render(<ChartError />);

			const alert = screen.getByRole("alert");
			expect(alert).toHaveAttribute("aria-live", "polite");
		});
	});

	// -------------------------------------------------------------------------
	// Min height
	// -------------------------------------------------------------------------

	it("applies default min height of 250px", () => {
		render(<ChartError />);

		const alert = screen.getByRole("alert");
		expect(alert.style.minHeight).toBe("250px");
	});

	it("applies custom min height", () => {
		render(<ChartError minHeight={400} />);

		const alert = screen.getByRole("alert");
		expect(alert.style.minHeight).toBe("400px");
	});
});
