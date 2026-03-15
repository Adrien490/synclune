import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCaptureException } = vi.hoisted(() => ({
	mockCaptureException: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@sentry/nextjs", () => ({
	captureException: mockCaptureException,
}));

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		RotateCcw: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "rotate-icon", ...props }),
	};
});

// Import AFTER mocks
import { ErrorBoundary } from "../error-boundary";

// ============================================================================
// HELPERS
// ============================================================================

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
	if (shouldThrow) throw new Error("Test error");
	return <div data-testid="child">OK</div>;
}

// Suppress console.error for error boundary tests
const originalConsoleError = console.error;

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	console.error = vi.fn();
});

afterEach(() => {
	console.error = originalConsoleError;
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("ErrorBoundary", () => {
	it("renders children when no error occurs", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent shouldThrow={false} />
			</ErrorBoundary>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("catches errors and displays default fallback", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Impossible de charger le contenu")).toBeInTheDocument();
		expect(screen.queryByTestId("child")).not.toBeInTheDocument();
	});

	it("reports error to Sentry", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(mockCaptureException).toHaveBeenCalledOnce();
		expect(mockCaptureException.mock.calls[0]![0]).toBeInstanceOf(Error);
		expect(mockCaptureException.mock.calls[0]![0].message).toBe("Test error");
	});

	it("displays custom error message", () => {
		render(
			<ErrorBoundary errorMessage="Erreur chargement produit">
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Erreur chargement produit")).toBeInTheDocument();
	});

	it("renders custom fallback when provided", () => {
		render(
			<ErrorBoundary fallback={<div data-testid="custom-fallback">Custom</div>}>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
		expect(screen.queryByText("Impossible de charger le contenu")).not.toBeInTheDocument();
	});

	it("has role='alert' on default fallback", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("has aria-live='assertive' on default fallback", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
	});

	it("shows Reessayer button", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Reessayer")).toBeInTheDocument();
	});

	it("retries rendering children on Reessayer click", () => {
		let shouldThrow = true;
		function ConditionalThrow() {
			if (shouldThrow) throw new Error("fail");
			return <div data-testid="recovered">Recovered</div>;
		}

		render(
			<ErrorBoundary>
				<ConditionalThrow />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Reessayer")).toBeInTheDocument();

		// Fix the error, then retry
		shouldThrow = false;
		fireEvent.click(screen.getByText("Reessayer"));

		expect(screen.getByTestId("recovered")).toBeInTheDocument();
	});

	it("calls onRetry callback when retrying", () => {
		const onRetry = vi.fn();
		render(
			<ErrorBoundary onRetry={onRetry}>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		fireEvent.click(screen.getByText("Reessayer"));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("shows 'Rafraichir la page' after max retries (default 3)", () => {
		render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		// Retry 3 times — each retry re-renders ThrowingComponent which throws again
		fireEvent.click(screen.getByText("Reessayer"));
		fireEvent.click(screen.getByText("Reessayer"));
		fireEvent.click(screen.getByText("Reessayer"));

		expect(
			screen.getByText("Le probleme persiste. Veuillez rafraichir la page."),
		).toBeInTheDocument();
		expect(screen.getByText("Rafraichir la page")).toBeInTheDocument();
		expect(screen.queryByText("Reessayer")).not.toBeInTheDocument();
	});

	it("respects custom maxRetries", () => {
		render(
			<ErrorBoundary maxRetries={1}>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		// After 1 retry, should show refresh message
		fireEvent.click(screen.getByText("Reessayer"));

		expect(screen.getByText("Rafraichir la page")).toBeInTheDocument();
	});

	it("calls window.location.reload on 'Rafraichir la page' click", () => {
		const reloadMock = vi.fn();
		Object.defineProperty(window, "location", {
			value: { reload: reloadMock },
			writable: true,
		});

		render(
			<ErrorBoundary maxRetries={0}>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		fireEvent.click(screen.getByText("Rafraichir la page"));
		expect(reloadMock).toHaveBeenCalledOnce();
	});

	it("applies custom className to the fallback container", () => {
		render(
			<ErrorBoundary className="custom-fallback-class">
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByRole("alert")).toHaveClass("custom-fallback-class");
	});
});
