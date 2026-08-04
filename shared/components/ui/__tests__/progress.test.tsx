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

	// Base UI dimensionne l'indicateur en `width` (style inline), là où Radix
	// utilisait un `translateX` négatif.
	it("sets indicator width to 50% when value=50", () => {
		const { container } = render(<Progress value={50} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator.style.width).toBe("50%");
	});

	it("sets indicator width to 0% when value=0", () => {
		const { container } = render(<Progress value={0} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator.style.width).toBe("0%");
	});

	it("sets indicator width to 100% when value=100", () => {
		const { container } = render(<Progress value={100} />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator.style.width).toBe("100%");
	});

	/**
	 * Changement de sémantique assumé à la migration Base UI : sans `value`, la
	 * barre n'est plus « 0 % » mais INDÉTERMINÉE — aucune largeur imposée (les
	 * appelants peuvent donc animer la leur) et pas d'`aria-valuenow`. C'est ce
	 * que `upload-progress` simulait déjà à la main pendant le traitement serveur.
	 */
	it("renders an indeterminate bar when value is undefined", () => {
		const { container } = render(<Progress />);
		const indicator = container.querySelector("[data-slot='progress-indicator']") as HTMLElement;
		expect(indicator.style.width).toBe("");
		expect(screen.getByRole("progressbar")).toHaveAttribute("data-indeterminate");
		expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
	});

	it("keeps the indicator as a DIRECT child of the root (call-site `>` selectors)", () => {
		const { container } = render(<Progress value={50} />);
		const root = container.querySelector("[data-slot='progress']") as HTMLElement;
		expect(root.querySelector(":scope > [data-slot='progress-indicator']")).not.toBeNull();
	});

	it("applies custom className", () => {
		render(<Progress value={50} className="my-progress" />);
		expect(screen.getByRole("progressbar")).toHaveClass("my-progress");
	});
});
