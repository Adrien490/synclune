import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
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

vi.mock("@/shared/utils/dates", () => ({
	formatDateTime: (date: Date) => `FORMATTED:${date.toISOString()}`,
}));

import { MaintenanceBanner } from "../maintenance-banner";

const REOPENS_AT = new Date("2026-05-22T14:00:00.000Z");

// ============================================================================
// TESTS
// ============================================================================

describe("MaintenanceBanner", () => {
	afterEach(() => {
		cleanup();
	});

	// ─── Basic rendering ──────────────────────────────────────────────────

	it("renders mobile text", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		expect(screen.getByText("Boutique fermée")).toBeInTheDocument();
	});

	it("renders desktop maintenance text", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		expect(
			screen.getByText(/Mode maintenance : la boutique est fermée pour les visiteurs/),
		).toBeInTheDocument();
	});

	it("renders closure message when provided", () => {
		render(<MaintenanceBanner closureMessage="Maintenance en cours" reopensAt={null} />);

		expect(screen.getByText(/Maintenance en cours/)).toBeInTheDocument();
	});

	it("does not render closure message span when null", () => {
		const { container } = render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const spans = container.querySelectorAll("span");
		const messageSpans = Array.from(spans).filter((s) => s.className.includes("ml-1"));
		expect(messageSpans).toHaveLength(0);
	});

	// ─── Reopening date ───────────────────────────────────────────────────

	it("renders reopening date when reopensAt is provided", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={REOPENS_AT} />);

		expect(
			screen.getByText(`· Réouverture le FORMATTED:${REOPENS_AT.toISOString()}`),
		).toBeInTheDocument();
	});

	it("does not render reopening date when reopensAt is null", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		expect(screen.queryByText(/Réouverture/)).not.toBeInTheDocument();
	});

	// ─── Long content robustness ──────────────────────────────────────────

	it("truncates the message span to keep the banner one line tall", () => {
		const { container } = render(
			<MaintenanceBanner closureMessage={"a".repeat(500)} reopensAt={null} />,
		);

		const messageSpan = container.querySelector("span.truncate");
		expect(messageSpan).not.toBeNull();
		expect(messageSpan?.className).toContain("min-w-0");
	});

	// ─── Link ─────────────────────────────────────────────────────────────

	it("renders gérer link pointing to admin boutique config", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link).toHaveAttribute("href", "/admin/configuration/boutique");
	});

	it("gérer link is always visible (no hidden class)", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link.className).not.toContain("hidden");
	});

	it("gérer link has a visible keyboard focus ring", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link.className).toContain("focus-visible:ring-2");
	});

	it("gérer link meets the minimum touch target height", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const link = screen.getByRole("link", { name: "Gérer" });
		expect(link.className).toContain("min-h-6");
	});

	// ─── Positioning ──────────────────────────────────────────────────────

	it("is fixed at the bottom of the viewport", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const banner = screen.getByRole("region", { name: "Statut de la boutique" });
		expect(banner.className).toContain("fixed");
		expect(banner.className).toContain("bottom-0");
	});

	// ─── Accessibility ────────────────────────────────────────────────────

	it("exposes a named region landmark", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		expect(screen.getByRole("region", { name: "Statut de la boutique" })).toBeInTheDocument();
	});

	it("construction icon has aria-hidden true", () => {
		render(<MaintenanceBanner closureMessage={null} reopensAt={null} />);

		const icon = screen.getByTestId("construction-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});
});
