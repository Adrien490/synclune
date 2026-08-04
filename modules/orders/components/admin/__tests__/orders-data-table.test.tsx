import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/data-table", () => ({
	AdminDataTable: ({ children }: { children: React.ReactNode }) => (
		<table data-testid="data-table">{children}</table>
	),
	TableEmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("../order-row-actions", () => ({
	OrderRowActions: ({ order }: { order: { orderNumber: string } }) => (
		<button aria-label={`Actions ${order.orderNumber}`} />
	),
}));

import { OrdersDataTable } from "../orders-data-table";

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "ord-1",
		orderNumber: "SYN-2026-0001",
		status: "PENDING",
		paymentStatus: "PENDING",
		trackingNumber: null,
		trackingUrl: null,
		invoiceNumber: null,
		invoiceStatus: null,
		total: 4999,
		createdAt: new Date("2026-05-01T10:00:00Z"),
		// Colonnes snapshot — le select liste n'a plus de join `user` (achat 100 %
		// invité, audit 2026-08-01 : l'ancien fixture `user: {...}` verrouillait
		// une colonne « Client » qui affichait « Invité » sur toutes les lignes).
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		...overrides,
	};
}

function makeResult(orders: ReturnType<typeof makeOrder>[]) {
	return Promise.resolve({
		orders,
		pagination: {
			hasNextPage: false,
			hasPreviousPage: false,
			nextCursor: null,
			prevCursor: null,
		},
		totalCount: orders.length,
	} as never);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("OrdersDataTable", () => {
	it("affiche l'état vide quand il n'y a aucune commande", async () => {
		const el = await OrdersDataTable({ ordersPromise: makeResult([]), perPage: 10 });
		render(el);
		expect(screen.getByTestId("empty-state")).toHaveTextContent("Aucune commande trouvée");
	});

	it("rend une ligne par commande avec lien, client, montant et statut", async () => {
		const el = await OrdersDataTable({
			ordersPromise: makeResult([makeOrder()]),
			perPage: 10,
		});
		render(el);

		const link = screen.getByRole("link", { name: /Voir commande SYN-2026-0001/ });
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes/ord-1");
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
		expect(screen.getByLabelText(/Statut : En attente/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Paiement : Paiement en attente/)).toBeInTheDocument();
	});
});
