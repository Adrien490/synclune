import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/data-table", () => ({
	AdminDataTable: ({
		children,
		pageItemIds,
		bulkActionsBar,
	}: {
		children: React.ReactNode;
		pageItemIds: string[];
		bulkActionsBar: React.ReactNode;
	}) => (
		<table data-testid="data-table" data-page-item-ids={JSON.stringify(pageItemIds)}>
			{children}
			{bulkActionsBar}
		</table>
	),
	BulkSelectionHeaderCheckbox: () => <input type="checkbox" aria-label="Tout sélectionner" />,
	BulkSelectionRowCheckbox: ({ itemLabel }: { itemLabel: string }) => (
		<input type="checkbox" aria-label={itemLabel} />
	),
	TableEmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("../order-row-actions", () => ({
	OrderRowActions: ({ order }: { order: { orderNumber: string } }) => (
		<button aria-label={`Actions ${order.orderNumber}`} />
	),
}));

vi.mock("../orders-bulk-actions-bar", () => ({
	OrdersBulkActionsBar: () => <div data-testid="bulk-bar" />,
}));

import { OrdersDataTable } from "../orders-data-table";

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "ord-1",
		orderNumber: "SYN-2026-0001",
		status: "PENDING",
		paymentStatus: "PENDING",
		fulfillmentStatus: "UNFULFILLED",
		trackingNumber: null,
		trackingUrl: null,
		invoiceNumber: null,
		invoiceStatus: null,
		total: 4999,
		createdAt: new Date("2026-05-01T10:00:00Z"),
		user: { name: "Marie Dupont", email: "marie@example.com" },
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
