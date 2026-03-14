import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img {...props} alt={props.alt as string} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

import { StoreClosurePage } from "../store-closure-page";

import type { StoreStatus } from "../../types/store-settings.types";

// ============================================================================
// HELPERS
// ============================================================================

function makeStatus(overrides: Partial<StoreStatus> = {}): StoreStatus {
	return {
		isClosed: true,
		closureMessage: "Nous sommes en vacances !",
		reopensAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("StoreClosurePage", () => {
	// ─── Basic rendering ──────────────────────────────────────────────────

	it("renders the closure heading", () => {
		render(<StoreClosurePage status={makeStatus()} />);

		expect(
			screen.getByRole("heading", {
				name: "Boutique temporairement fermée",
			}),
		).toBeInTheDocument();
	});

	it("renders the closure message", () => {
		render(
			<StoreClosurePage
				status={makeStatus({
					closureMessage: "Maintenance en cours",
				})}
			/>,
		);

		expect(screen.getByText("Maintenance en cours")).toBeInTheDocument();
	});

	// ─── Reopen date ──────────────────────────────────────────────────────

	it("renders without reopen date when reopensAt is null", () => {
		render(<StoreClosurePage status={makeStatus({ reopensAt: null })} />);

		expect(screen.queryByRole("time")).not.toBeInTheDocument();
		expect(screen.queryByText(/réouverture/i)).not.toBeInTheDocument();
	});

	it("renders reopen date with French formatting when reopensAt is set", () => {
		const reopensAt = new Date("2026-04-01T10:00:00Z");
		render(<StoreClosurePage status={makeStatus({ reopensAt })} />);

		const timeElement = screen.getByRole("time");
		expect(timeElement).toBeInTheDocument();
		expect(timeElement).toHaveAttribute("dateTime", reopensAt.toISOString());
		expect(screen.getByText(/réouverture prévue le/i)).toBeInTheDocument();
		// Verify French date format (e.g., "1 avril 2026")
		expect(timeElement.textContent).toMatch(/avril 2026/);
	});

	// ─── Contact link ─────────────────────────────────────────────────────

	it("renders a mailto contact link", () => {
		render(<StoreClosurePage status={makeStatus()} />);

		const links = screen.getAllByRole("link", { name: /nous contacter/i });
		const mailto = links.find((l) => l.getAttribute("href") === "mailto:contact@synclune.fr");
		expect(mailto).toBeDefined();
	});

	// ─── Accessibility ────────────────────────────────────────────────────

	it("has aria-live polite on the content area", () => {
		const { container } = render(<StoreClosurePage status={makeStatus()} />);

		const liveRegion = container.querySelector("[aria-live]");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
	});

	it("hides decorative elements from screen readers", () => {
		const { container } = render(<StoreClosurePage status={makeStatus()} />);

		const hiddenElements = container.querySelectorAll("[aria-hidden=true]");
		expect(hiddenElements.length).toBeGreaterThanOrEqual(1);
	});
});
