import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("date-fns", () => ({
	formatDistanceToNow: vi.fn(() => "il y a 2 heures"),
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("lucide-react", () => ({
	AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
	Clock: () => <svg data-testid="icon-clock" />,
	CreditCard: () => <svg data-testid="icon-credit-card" />,
	FileText: () => <svg data-testid="icon-file-text" />,
	MapPin: () => <svg data-testid="icon-map-pin" />,
	Package: () => <svg data-testid="icon-package" />,
	Truck: () => <svg data-testid="icon-truck" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		size?: string;
		className?: string;
	}) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderAction: {
		CREATED: "CREATED",
		PAID: "PAID",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
		RETURNED: "RETURNED",
		STATUS_REVERTED: "STATUS_REVERTED",
		TRACKING_UPDATED: "TRACKING_UPDATED",
		ADDRESS_UPDATED: "ADDRESS_UPDATED",
		INVOICE_GENERATED: "INVOICE_GENERATED",
		REFUND_CREATED: "REFUND_CREATED",
		REFUND_COMPLETED: "REFUND_COMPLETED",
		REFUND_FAILED: "REFUND_FAILED",
		DISPUTE_OPENED: "DISPUTE_OPENED",
		DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
		INVOICE_VOIDED: "INVOICE_VOIDED",
	},
	HistorySource: {
		ADMIN: "ADMIN",
		WEBHOOK: "WEBHOOK",
		SYSTEM: "SYSTEM",
		CUSTOMER: "CUSTOMER",
	},
}));

import { OrderHistoryTimeline } from "../order-detail/order-history-timeline";

// ============================================================================
// TYPES & FACTORY
// ============================================================================

interface TestOrderHistoryEntry {
	id: string;
	action: string;
	previousStatus?: string | null;
	newStatus?: string | null;
	previousPaymentStatus?: string | null;
	newPaymentStatus?: string | null;
	previousFulfillmentStatus?: string | null;
	newFulfillmentStatus?: string | null;
	note?: string | null;
	metadata?: unknown;
	authorName?: string | null;
	source: string;
	createdAt: Date;
}

type ComponentEntry = Parameters<typeof OrderHistoryTimeline>[0]["history"][0];

function createEntry(overrides: Partial<TestOrderHistoryEntry> = {}): ComponentEntry {
	return {
		id: "entry-1",
		action: "CREATED",
		previousStatus: null,
		newStatus: "PENDING",
		previousPaymentStatus: null,
		newPaymentStatus: null,
		previousFulfillmentStatus: null,
		newFulfillmentStatus: null,
		note: null,
		metadata: null,
		authorName: null,
		source: "SYSTEM",
		createdAt: new Date("2026-03-20T10:00:00Z"),
		...overrides,
	} as unknown as ComponentEntry;
}

function createEntries(count: number): ComponentEntry[] {
	return Array.from({ length: count }, (_, i) =>
		createEntry({ id: `entry-${i + 1}`, action: "CREATED" }),
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
});

describe("OrderHistoryTimeline", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders 'Aucun historique disponible' when history is empty", () => {
		render(<OrderHistoryTimeline history={[]} />);

		expect(screen.getByText("Aucun historique disponible")).toBeInTheDocument();
	});

	it("renders 'Historique des actions' title when history is empty", () => {
		render(<OrderHistoryTimeline history={[]} />);

		expect(screen.getByText("Historique des actions")).toBeInTheDocument();
	});

	// ─── Basic rendering ──────────────────────────────────────────────────────

	it("renders 'Historique des actions' title with history", () => {
		render(<OrderHistoryTimeline history={[createEntry()]} />);

		expect(screen.getByText("Historique des actions")).toBeInTheDocument();
	});

	it("shows count badge with correct number", () => {
		const history = createEntries(3);

		render(<OrderHistoryTimeline history={history} />);

		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders correct action label for CREATED action", () => {
		render(<OrderHistoryTimeline history={[createEntry({ action: "CREATED" })]} />);

		expect(screen.getByText("Commande créée")).toBeInTheDocument();
	});

	it("shows relative timestamp from formatDistanceToNow", () => {
		render(<OrderHistoryTimeline history={[createEntry()]} />);

		expect(screen.getByText("il y a 2 heures")).toBeInTheDocument();
	});

	// ─── Status transitions ───────────────────────────────────────────────────

	it("shows order status transition when newStatus is present", () => {
		const entry = createEntry({
			previousStatus: "PENDING",
			newStatus: "PROCESSING",
		});

		render(<OrderHistoryTimeline history={[entry]} />);

		expect(screen.getByText(/Statut/)).toHaveTextContent("Statut : En attente → En préparation");
	});

	it("shows payment status transition when newPaymentStatus is present", () => {
		const entry = createEntry({
			newStatus: null,
			previousPaymentStatus: "PENDING",
			newPaymentStatus: "PAID",
		});

		render(<OrderHistoryTimeline history={[entry]} />);

		expect(screen.getByText(/Paiement/)).toHaveTextContent("Paiement : En attente → Payé");
	});

	it("shows fulfillment transition only when newFulfillmentStatus is present and newStatus is absent", () => {
		const entry = createEntry({
			newStatus: null,
			previousFulfillmentStatus: "UNFULFILLED",
			newFulfillmentStatus: "RETURNED",
		});

		render(<OrderHistoryTimeline history={[entry]} />);

		expect(screen.getByText(/Traitement/)).toHaveTextContent("Traitement : Non préparé → Retourné");
	});

	// ─── Content ──────────────────────────────────────────────────────────────

	it("shows note text when note is present", () => {
		const entry = createEntry({ note: "Colis endommagé à la livraison" });

		render(<OrderHistoryTimeline history={[entry]} />);

		expect(screen.getByText(/"Colis endommagé à la livraison"/)).toBeInTheDocument();
	});

	it("shows source badge label 'Admin' for ADMIN source", () => {
		render(<OrderHistoryTimeline history={[createEntry({ source: "ADMIN" })]} />);

		expect(screen.getByText("Admin")).toBeInTheDocument();
	});

	it("shows source badge label 'Stripe' for WEBHOOK source", () => {
		render(<OrderHistoryTimeline history={[createEntry({ source: "WEBHOOK" })]} />);

		expect(screen.getByText("Stripe")).toBeInTheDocument();
	});

	it("shows source badge label 'Client' for CUSTOMER source", () => {
		render(<OrderHistoryTimeline history={[createEntry({ source: "CUSTOMER" })]} />);

		expect(screen.getByText("Client")).toBeInTheDocument();
	});

	it("shows source badge label 'Système' for SYSTEM source", () => {
		render(<OrderHistoryTimeline history={[createEntry({ source: "SYSTEM" })]} />);

		expect(screen.getByText("Système")).toBeInTheDocument();
	});

	it("shows author name when authorName is present", () => {
		const entry = createEntry({ authorName: "Jean" });

		render(<OrderHistoryTimeline history={[entry]} />);

		expect(screen.getByText("par Jean")).toBeInTheDocument();
	});

	// ─── Expansion ────────────────────────────────────────────────────────────

	it("shows expand button with hidden count when history exceeds 5 entries", () => {
		const history = createEntries(8);

		render(<OrderHistoryTimeline history={history} />);

		expect(screen.getByText("Voir 3 entrées plus anciennes")).toBeInTheDocument();
	});

	it("clicking expand button shows all entries and reveals the reduce button", () => {
		const history = createEntries(8);

		render(<OrderHistoryTimeline history={history} />);

		const expandButton = screen.getByText("Voir 3 entrées plus anciennes");
		fireEvent.click(expandButton);

		expect(screen.queryByText("Voir 3 entrées plus anciennes")).not.toBeInTheDocument();
		expect(screen.getByText("Réduire")).toBeInTheDocument();
	});

	it("clicking reduce button collapses the list and shows expand button again", () => {
		const history = createEntries(8);

		render(<OrderHistoryTimeline history={history} />);

		fireEvent.click(screen.getByText("Voir 3 entrées plus anciennes"));
		fireEvent.click(screen.getByText("Réduire"));

		expect(screen.getByText("Voir 3 entrées plus anciennes")).toBeInTheDocument();
		expect(screen.queryByText("Réduire")).not.toBeInTheDocument();
	});
});
