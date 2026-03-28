import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

vi.mock("@/shared/components/tab-navigation", () => ({
	TabNavigation: ({
		items,
		activeValue,
		ariaLabel,
	}: {
		items: Array<{ label: string; value: string; href: string }>;
		activeValue: string;
		ariaLabel?: string;
	}) => (
		<nav aria-label={ariaLabel} data-testid="tab-navigation">
			{items.map((item) => (
				<a
					key={item.value}
					href={item.href}
					data-active={item.value === activeValue ? "true" : "false"}
					data-value={item.value}
				>
					{item.label}
				</a>
			))}
		</nav>
	),
}));

import { CollectionStatusNavigation } from "../collection-status-navigation";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionStatusNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Tab items ────────────────────────────────────────────────────────────

	it("renders 'Toutes' tab item", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		expect(screen.getByText("Toutes")).toBeInTheDocument();
	});

	it("renders 'Publiées' tab item", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		expect(screen.getByText("Publiées")).toBeInTheDocument();
	});

	it("renders 'Brouillons' tab item", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		expect(screen.getByText("Brouillons")).toBeInTheDocument();
	});

	it("renders 'Archivées' tab item", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		expect(screen.getByText("Archivées")).toBeInTheDocument();
	});

	it("renders all 4 tabs", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		const nav = screen.getByTestId("tab-navigation");
		const links = nav.querySelectorAll("a");
		expect(links).toHaveLength(4);
	});

	// ─── aria-label ───────────────────────────────────────────────────────────

	it("passes correct aria-label to TabNavigation", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		expect(
			screen.getByRole("navigation", { name: "Navigation par statuts de collections" }),
		).toBeInTheDocument();
	});

	// ─── Active value ─────────────────────────────────────────────────────────

	it("marks 'all' as active when no status is provided", () => {
		render(<CollectionStatusNavigation currentStatus={undefined} />);
		const allLink = screen.getByText("Toutes").closest("a");
		expect(allLink).toHaveAttribute("data-active", "true");
	});

	it("marks PUBLIC as active when currentStatus is PUBLIC", () => {
		render(<CollectionStatusNavigation currentStatus={"PUBLIC" as any} />);
		const publicLink = screen.getByText("Publiées").closest("a");
		expect(publicLink).toHaveAttribute("data-active", "true");
	});
});
