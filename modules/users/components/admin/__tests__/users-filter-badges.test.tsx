import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFilters } = vi.hoisted(() => ({
	mockFilters: { value: [] as Array<{ key: string; value: string }> },
}));

vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: ({
		formatFilter,
	}: {
		formatFilter: (filter: { key: string; value: string }) => {
			label: string;
			displayValue: string;
		};
	}) => (
		<div data-testid="filter-badges">
			{mockFilters.value.map((f, i) => {
				const formatted = formatFilter(f);
				return (
					<span key={i} data-testid={`filter-badge-${i}`}>
						{formatted.label}: {formatted.displayValue}
					</span>
				);
			})}
		</div>
	),
}));

vi.mock("@/shared/hooks/use-filter", () => ({}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersFilterBadges } from "../users-filter-badges";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockFilters.value = [];
});

beforeEach(() => {
	mockFilters.value = [];
});

describe("UsersFilterBadges", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the FilterBadges component", () => {
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	// ─── formatUserFilter logic ───────────────────────────────────────────────

	it("formats role=ADMIN as 'Rôle: Admin'", () => {
		mockFilters.value = [{ key: "filter_role", value: "ADMIN" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Rôle: Admin");
	});

	it("formats role=USER as 'Rôle: Utilisateur'", () => {
		mockFilters.value = [{ key: "filter_role", value: "USER" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Rôle: Utilisateur");
	});

	it("formats emailVerified=true as 'Email vérifié: Oui'", () => {
		mockFilters.value = [{ key: "filter_emailVerified", value: "true" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Email vérifié: Oui");
	});

	it("formats emailVerified=false as 'Email vérifié: Non'", () => {
		mockFilters.value = [{ key: "filter_emailVerified", value: "false" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Email vérifié: Non");
	});

	it("formats marketingOptIn=true as 'Marketing: Accepté'", () => {
		mockFilters.value = [{ key: "filter_marketingOptIn", value: "true" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Marketing: Accepté");
	});

	it("formats marketingOptIn=false as 'Marketing: Refusé'", () => {
		mockFilters.value = [{ key: "filter_marketingOptIn", value: "false" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Marketing: Refusé");
	});

	it("formats hasOrders=true as 'Commandes: Avec commandes'", () => {
		mockFilters.value = [{ key: "filter_hasOrders", value: "true" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Commandes: Avec commandes");
	});

	it("formats hasOrders=false as 'Commandes: Sans commande'", () => {
		mockFilters.value = [{ key: "filter_hasOrders", value: "false" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Commandes: Sans commande");
	});

	it("formats includeDeleted=true as 'Inclure supprimés: Oui'", () => {
		mockFilters.value = [{ key: "filter_includeDeleted", value: "true" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Inclure supprimés: Oui");
	});

	it("formats preferredLanguage as uppercase display value", () => {
		mockFilters.value = [{ key: "filter_preferredLanguage", value: "fr" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("Langue: FR");
	});

	it("formats createdAfter date in fr-FR locale", () => {
		mockFilters.value = [{ key: "filter_createdAfter", value: "2026-01-15" }];
		render(<UsersFilterBadges />);
		const text = screen.getByTestId("filter-badge-0").textContent ?? "";
		expect(text).toContain("Inscrit après");
	});

	it("uses key as label for unknown filter keys", () => {
		mockFilters.value = [{ key: "filter_unknownKey", value: "someValue" }];
		render(<UsersFilterBadges />);
		expect(screen.getByTestId("filter-badge-0").textContent).toBe("unknownKey: someValue");
	});
});
