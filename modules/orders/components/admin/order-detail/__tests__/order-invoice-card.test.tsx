import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children }: any) => <div role="alert">{children}</div>,
	AlertTitle: ({ children }: any) => <div>{children}</div>,
	AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	WarningIcon: () => <svg aria-hidden="true" />,
	FileTextIcon: () => <svg aria-hidden="true" />,
	FileXIcon: () => <svg aria-hidden="true" />,
	ShieldCheckIcon: () => <svg aria-hidden="true" />,
}));

vi.mock("date-fns", () => ({ format: () => "10 janvier 2026 à 14h00" }));
vi.mock("date-fns/locale", () => ({ fr: {} }));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ label }: any) => <button aria-label={`Copier ${label}`} />,
}));

// Boutons de téléchargement : on expose juste un marqueur identifiable.
vi.mock("../download-admin-invoice-button", () => ({
	DownloadAdminInvoiceButton: () => <button>Télécharger le PDF</button>,
}));
vi.mock("../download-admin-credit-note-button", () => ({
	DownloadAdminCreditNoteButton: ({ creditNoteNumber }: any) => (
		<button>Télécharger l&apos;avoir {creditNoteNumber}</button>
	),
}));
vi.mock("@/modules/orders/components/admin/invoice-status-badge", () => ({
	InvoiceStatusBadge: ({ status }: any) => <span>badge:{status}</span>,
}));

import { OrderInvoiceCard } from "../order-invoice-card";

afterEach(cleanup);

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		paymentStatus: "PAID",
		invoiceStatus: "GENERATED",
		invoiceNumber: "F-2026-00012",
		invoiceGeneratedAt: new Date("2026-01-10T14:00:00Z"),
		invoicePdfHash: "a".repeat(64),
		invoiceRetryDeferred: false,
		creditNoteNumber: null,
		creditNoteGeneratedAt: null,
		invoiceVoidedAt: null,
		...overrides,
	} as any;
}

describe("OrderInvoiceCard", () => {
	it("affiche le numéro de facture et le bouton de téléchargement PDF", () => {
		render(<OrderInvoiceCard order={createOrder()} />);
		expect(screen.getByText("F-2026-00012")).toBeInTheDocument();
		expect(screen.getByText("Télécharger le PDF")).toBeInTheDocument();
	});

	it("affiche le bouton avoir quand la facture est VOIDED avec un creditNoteNumber (EINV-UI-101)", () => {
		render(
			<OrderInvoiceCard
				order={createOrder({
					invoiceStatus: "VOIDED",
					creditNoteNumber: "A-2026-00003",
					invoiceVoidedAt: new Date("2026-02-01T10:00:00Z"),
				})}
			/>,
		);
		expect(screen.getByText("A-2026-00003")).toBeInTheDocument();
		expect(screen.getByText(/Télécharger l'avoir A-2026-00003/)).toBeInTheDocument();
	});

	it("n'affiche PAS le bouton avoir si la facture n'est pas VOIDED", () => {
		render(<OrderInvoiceCard order={createOrder({ creditNoteNumber: "A-2026-00003" })} />);
		expect(screen.queryByText(/Télécharger l'avoir/)).not.toBeInTheDocument();
	});

	it("affiche l'alerte DLQ quand invoiceRetryDeferred=true malgré une facture émise (EINV-UI-105)", () => {
		render(<OrderInvoiceCard order={createOrder({ invoiceRetryDeferred: true })} />);
		expect(screen.getByText("Archivage / avoir en échec")).toBeInTheDocument();
		// Plus de « escaladé (N tentatives) » : le compteur `invoiceReconcileAttempts`
		// a été retiré (audit du module orders, 2026-08-05). Le bandeau reste affiché
		// tant que le drapeau DLQ est posé — c'est lui la surface de suivi.
		expect(screen.getByText(/réessaie chaque nuit/)).toBeInTheDocument();
	});

	it("affiche l'anomalie 'payée sans facture' quand PAID sans invoiceNumber", () => {
		render(<OrderInvoiceCard order={createOrder({ invoiceNumber: null, invoiceStatus: null })} />);
		expect(screen.getByText("Anomalie de facturation")).toBeInTheDocument();
	});
});
