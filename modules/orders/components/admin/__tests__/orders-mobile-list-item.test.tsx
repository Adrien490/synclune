import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePendingCtx, mockUseOrderActions } = vi.hoisted(() => ({
	mockUsePendingCtx: vi.fn(),
	mockUseOrderActions: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/shared/components/long-press-menu-link", () => ({
	LinkPendingOverlay: () => null,
	// Rendu (et non stubé à `null`) pour que le test d'affordance ci-dessous
	// vérifie une présence réelle dans le `<Link>`.
	DefaultLongPressAffordance: () => <svg data-testid="long-press-affordance" aria-hidden="true" />,
}));

vi.mock("@/shared/components/mobile-selection", () => ({
	MobileSelectableCard: ({
		children,
		itemLabel,
	}: {
		children: React.ReactNode;
		itemLabel: string;
	}) => (
		<div data-testid="selectable-card" aria-label={itemLabel}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", () => ({
	ResponsiveActionMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveActionMenuContent: () => <div data-testid="action-menu" />,
}));

vi.mock("@/shared/components/swipeable-card", () => ({
	SwipeableCard: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="swipeable-card">{children}</div>
	),
}));

vi.mock("@/shared/contexts/admin-list-pending-context", () => ({
	useAdminListPendingContextOptional: () => mockUsePendingCtx(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-gesture-hint-once", () => ({
	useGestureHintOnce: () => false,
}));

vi.mock("@/shared/hooks/use-long-press", () => ({
	useLongPress: () => ({ bind: {} }),
}));

vi.mock("@/modules/orders/hooks/use-order-actions", () => ({
	useOrderActions: () => mockUseOrderActions(),
}));

import { OrdersMobileListItem } from "../orders-mobile-list-item";

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "ord-1",
		orderNumber: "SYN-2026-0001",
		status: "PENDING" as const,
		paymentStatus: "PENDING" as const,
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		total: 4999,
		createdAt: new Date("2026-05-01T10:00:00Z"),
		_count: { items: 2 },
		fulfillmentStatus: "UNFULFILLED" as const,
		trackingNumber: null,
		trackingUrl: null,
		invoiceNumber: null,
		invoiceStatus: null,
		...overrides,
	};
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUsePendingCtx.mockReturnValue(null);
	mockUseOrderActions.mockReturnValue({ sections: [] });
});

describe("OrdersMobileListItem", () => {
	it("rend la carte avec lien détail, client, montant et statuts hors mode sélection", () => {
		render(<OrdersMobileListItem order={makeOrder()} />);

		const link = screen.getByRole("link", { name: /Commande SYN-2026-0001/ });
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/ord-1");
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
		expect(screen.getByText("En attente")).toBeInTheDocument();
		expect(screen.getByText("Paiement en attente")).toBeInTheDocument();
		expect(screen.getByText(/2 articles/)).toBeInTheDocument();
		expect(screen.getByTestId("swipeable-card")).toBeInTheDocument();
	});

	/**
	 * @regression long-press-affordance-by-default
	 * Cette carte réimplémente le pattern long-press à la main (le `<Link>` doit
	 * vivre DANS `SwipeableCard`), elle ne bénéficie donc pas du défaut de
	 * `LongPressMenuLink`. Sans indice, le menu d'actions — seul chemin non gestuel
	 * vers les notes depuis la liste — n'était annoncé par rien à l'écran.
	 */
	it("rend un indice visuel de long-press dans le lien de la carte", () => {
		render(<OrdersMobileListItem order={makeOrder()} />);

		const link = screen.getByRole("link", { name: /Commande SYN-2026-0001/ });
		expect(link).toContainElement(screen.getByTestId("long-press-affordance"));
	});
});
