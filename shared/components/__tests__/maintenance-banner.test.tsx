import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Construction: ({
		className,
		"aria-hidden": ariaHidden,
	}: {
		className?: string;
		"aria-hidden"?: boolean | "true";
	}) => <span data-testid="construction-icon" className={className} aria-hidden={ariaHidden} />,
}));

import { MaintenanceBanner } from "../maintenance-banner";

// ============================================================================
// TESTS
// ============================================================================

describe("MaintenanceBanner", () => {
	afterEach(() => {
		cleanup();
	});

	// ─── Basic rendering ──────────────────────────────────────────────────

	it("renders mobile text", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		expect(screen.getByText("Boutique fermée")).toBeInTheDocument();
	});

	it("renders desktop maintenance text", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		expect(
			screen.getByText(/Mode maintenance — La boutique est fermée pour les visiteurs/),
		).toBeInTheDocument();
	});

	it("renders closure message when provided", () => {
		render(<MaintenanceBanner closureMessage="Maintenance en cours" />);

		expect(screen.getByText(/Maintenance en cours/)).toBeInTheDocument();
	});

	it("does not render closure message span when null", () => {
		const { container } = render(<MaintenanceBanner closureMessage={null} />);

		const spans = container.querySelectorAll("span");
		const messageSpans = Array.from(spans).filter((s) => s.className.includes("ml-1"));
		expect(messageSpans).toHaveLength(0);
	});

	// ─── Link ─────────────────────────────────────────────────────────────

	it("renders gérer link pointing to admin boutique config", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link).toHaveAttribute("href", "/admin/configuration/boutique");
	});

	it("gérer link is always visible (no hidden class)", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link.className).not.toContain("hidden");
	});

	// ─── Positioning ──────────────────────────────────────────────────────

	it("is fixed at the bottom of the viewport", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		const banner = screen.getByRole("status");
		expect(banner.className).toContain("fixed");
		expect(banner.className).toContain("bottom-0");
	});

	// ─── Accessibility ────────────────────────────────────────────────────

	it("has role status for screen readers", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("construction icon has aria-hidden true", () => {
		render(<MaintenanceBanner closureMessage={null} />);

		const icon = screen.getByTestId("construction-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});
});
