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

vi.mock("lucide-react", () => ({
	Loader2Icon: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
		<svg data-testid="loader-icon" className={className} {...props} />
	),
}));

// Import AFTER mocks
import { Spinner } from "../spinner";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Spinner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with role=status", () => {
		render(<Spinner />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-label='Chargement'", () => {
		render(<Spinner />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement");
	});

	it("renders the Loader2Icon with aria-hidden", () => {
		render(<Spinner />);
		const icon = screen.getByTestId("loader-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("icon has motion-safe:animate-spin class", () => {
		render(<Spinner />);
		// Préfixe `motion-safe:` : l'animation était inconditionnelle, contrairement
		// à `Skeleton`. Sous `prefers-reduced-motion` l'icône reste visible, statique.
		expect(screen.getByTestId("loader-icon")).toHaveClass("motion-safe:animate-spin");
	});

	it("applies custom className to the icon", () => {
		render(<Spinner className="text-destructive" />);
		expect(screen.getByTestId("loader-icon")).toHaveClass("text-destructive");
	});
});
