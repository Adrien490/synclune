import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRouterPush,
	mockFormState,
	mockAction,
	mockIsPending,
	mockGetFieldValue,
	mockSetFieldValue,
	mockHandleSubmit,
	useCreateRefundFormMock,
	getDefaultRestockMock,
	getAvailableQuantityMock,
} = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockFormState: {
		reason: "CUSTOMER_REQUEST",
		note: "",
		acceptCancelledOrder: false,
		isDirty: false,
		submissionAttempts: 0,
		fieldMeta: {} as Record<string, { errors?: unknown[] }>,
		items: [] as { orderItemId: string; selected: boolean; quantity: number; restock: boolean }[],
		selectedItems: [] as {
			orderItemId: string;
			selected: boolean;
			quantity: number;
			restock: boolean;
		}[],
		totalAmount: 0,
		itemsForAction: [] as unknown[],
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockGetFieldValue: vi.fn(),
	mockSetFieldValue: vi.fn(),
	mockHandleSubmit: vi.fn(() => Promise.resolve()),
	useCreateRefundFormMock: vi.fn(),
	getDefaultRestockMock: vi.fn((reason: string) => reason === "CUSTOMER_REQUEST"),
	getAvailableQuantityMock: vi.fn(() => 1),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/modules/refunds/hooks/use-create-refund-form", () => ({
	useCreateRefundForm: useCreateRefundFormMock,
	getDefaultRestock: getDefaultRestockMock,
	getAvailableQuantity: getAvailableQuantityMock,
}));

// useStore lit le store du formulaire via le sélecteur fourni — on le branche
// directement sur mockFormState (valeurs + isDirty).
vi.mock("@tanstack/react-form-nextjs", () => ({
	useStore: (_store: unknown, selector: (s: unknown) => unknown) =>
		selector({
			values: {
				reason: mockFormState.reason,
				note: mockFormState.note,
				acceptCancelledOrder: mockFormState.acceptCancelledOrder,
			},
			isDirty: mockFormState.isDirty,
			submissionAttempts: mockFormState.submissionAttempts,
			fieldMeta: mockFormState.fieldMeta,
		}),
}));

vi.mock("@/modules/refunds/services/refund-calculation.service", () => ({
	canSubmitRefund: vi.fn(() => true),
	getAvailableQuantity: vi.fn((item: { quantity?: number }) => item.quantity ?? 1),
}));

vi.mock("@/modules/refunds/components/admin/refund-item-row", () => ({
	RefundItemRow: ({
		orderItem,
		onToggle,
		onQuantityChange,
		onRestockToggle,
	}: {
		orderItem: { id: string; productTitle: string };
		onToggle?: (id: string, checked: boolean) => void;
		onQuantityChange?: (id: string, quantity: number) => void;
		onRestockToggle?: (id: string, checked: boolean) => void;
	}) => (
		<div data-testid={`refund-item-${orderItem.id}`}>
			{orderItem.productTitle}
			<button data-testid={`toggle-${orderItem.id}`} onClick={() => onToggle?.(orderItem.id, true)}>
				select
			</button>
			<button
				data-testid={`qty-${orderItem.id}`}
				onClick={() => onQuantityChange?.(orderItem.id, 2)}
			>
				qty
			</button>
			<button
				data-testid={`restock-${orderItem.id}`}
				onClick={() => onRestockToggle?.(orderItem.id, false)}
			>
				restock
			</button>
		</div>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		asChild,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		size?: string;
		asChild?: boolean;
		onClick?: () => void;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<button
				disabled={disabled}
				type={type as "button" | "submit" | "reset"}
				data-variant={variant}
				onClick={onClick}
			>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	CardTitle: ({ children }: { children: React.ReactNode; className?: string }) => (
		<h3 data-testid="card-title">{children}</h3>
	),
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
	Package: () => <svg data-testid="icon-package" />,
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
}));

vi.mock("@/modules/refunds/constants/refund.constants", () => ({
	REFUND_REASON_LABELS: {
		CUSTOMER_REQUEST: "Rétractation client",
		DEFECTIVE: "Produit défectueux",
		WRONG_ITEM: "Erreur de préparation",
		LOST_IN_TRANSIT: "Colis perdu",
		FRAUD: "Fraude",
		OTHER: "Autre",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CreateRefundForm } from "../create-refund-form";
import { canSubmitRefund } from "@/modules/refunds/services/refund-calculation.service";

// ============================================================================
// FAKE FORM INSTANCE
//
// Le composant utilise désormais les primitives TanStack Form (AppField,
// AppForm, Subscribe) + les field components partagés (SelectField,
// TextareaField, CheckboxField). On fournit un faux formulaire qui rend des
// éléments natifs porteurs de testids équivalents, et route handleChange vers
// mockFormState + les listeners (pour le recalcul restock au changement de
// motif).
// ============================================================================

type AppFieldChildren = (field: Record<string, unknown>) => React.ReactNode;

function buildFakeFieldComponents(
	name: string,
	value: unknown,
	handleChange: (v: unknown) => void,
) {
	return {
		SelectField: ({
			label,
			options,
			disabled,
		}: {
			label?: string;
			options: { value: string; label: string }[];
			disabled?: boolean;
		}) => (
			<>
				{label ? <span data-testid="select-label">{label}</span> : null}
				<select
					data-testid="select"
					data-value={value as string}
					data-disabled={String(Boolean(disabled))}
					value={value as string}
					disabled={disabled}
					onChange={(e) => handleChange(e.target.value)}
					aria-label={label ?? "Motif du remboursement"}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</>
		),
		TextareaField: ({
			label,
			optional,
			placeholder,
			disabled,
		}: {
			label?: string;
			optional?: boolean;
			placeholder?: string;
			disabled?: boolean;
		}) => (
			<>
				{label ? (
					<span data-testid="note-label">
						{label}
						{optional ? " (Optionnel)" : null}
					</span>
				) : null}
				<textarea
					data-testid="note-textarea"
					value={value as string}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(e) => handleChange(e.target.value)}
				/>
			</>
		),
		CheckboxField: ({ label }: { label?: React.ReactNode }) => (
			<label>
				<input
					type="checkbox"
					data-testid="accept-cancelled"
					checked={Boolean(value)}
					onChange={(e) => handleChange(e.target.checked)}
				/>
				{label}
			</label>
		),
	};
}

function createFakeForm() {
	const form = {
		store: {},
		state: { isValid: true, isSubmitting: false },
		getFieldValue: mockGetFieldValue,
		setFieldValue: mockSetFieldValue,
		handleSubmit: mockHandleSubmit,
		AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		Subscribe: ({
			selector,
			children,
		}: {
			selector: (s: unknown) => unknown;
			children: (v: unknown) => React.ReactNode;
		}) =>
			children(
				selector({
					submissionAttempts: mockFormState.submissionAttempts,
					fieldMeta: mockFormState.fieldMeta,
				}),
			),
		AppField: ({
			name,
			listeners,
			children,
		}: {
			name: string;
			listeners?: { onChange?: (e: { value: unknown }) => void };
			children: AppFieldChildren;
		}) => {
			const value = (mockFormState as Record<string, unknown>)[name];
			const handleChange = (v: unknown) => {
				(mockFormState as Record<string, unknown>)[name] = v;
				listeners?.onChange?.({ value: v });
			};
			const field = {
				name,
				state: { value, meta: { errors: [] as string[] } },
				handleChange,
				handleBlur: vi.fn(),
				...buildFakeFieldComponents(name, value, handleChange),
			};
			return children(field);
		},
	};
	return form;
}

// ============================================================================
// TEST DATA
// ============================================================================

function createMockOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-2026-0001",
		customerName: "Marie Dupont",
		status: "DELIVERED",
		subtotal: 10000,
		discountAmount: 0,
		total: 10000,
		refunds: [],
		items: [
			{
				id: "item-1",
				productTitle: "Bague dorée",
				productImageUrl: null,
				skuImageUrl: null,
				skuColor: null,
				skuMaterial: null,
				skuSize: null,
				price: 5000,
				quantity: 2,
				refundItems: [],
			},
		],
		...overrides,
	} as never;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateRefundForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
		mockFormState.reason = "CUSTOMER_REQUEST";
		mockFormState.note = "";
		mockFormState.acceptCancelledOrder = false;
		mockFormState.isDirty = false;
		mockFormState.submissionAttempts = 0;
		mockFormState.fieldMeta = {};
		mockFormState.items = [];
		mockFormState.selectedItems = [];
		mockFormState.totalAmount = 0;
		mockFormState.itemsForAction = [];

		mockGetFieldValue.mockImplementation((field: string) => {
			if (field === "items") return mockFormState.items;
			if (field === "reason") return mockFormState.reason;
			return undefined;
		});
		mockSetFieldValue.mockReset();
		mockHandleSubmit.mockImplementation(() => Promise.resolve());

		useCreateRefundFormMock.mockImplementation(() => ({
			form: createFakeForm(),
			action: mockAction,
			isPending: mockIsPending.value,
			reason: mockFormState.reason,
			items: mockFormState.items,
			selectedItems: mockFormState.selectedItems,
			totalAmount: mockFormState.totalAmount,
			itemsForAction: mockFormState.itemsForAction,
		}));

		vi.mocked(canSubmitRefund).mockReturnValue(true);
		getDefaultRestockMock.mockImplementation((reason: string) => reason === "CUSTOMER_REQUEST");
		getAvailableQuantityMock.mockReturnValue(1);
	});

	// ─── Header ───────────────────────────────────────────────────────────────

	it("renders the page heading 'Nouveau remboursement'", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Nouveau remboursement")).toBeInTheDocument();
	});

	it("renders the order number and customer name in subtitle", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/CMD-2026-0001/)).toBeInTheDocument();
		expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument();
	});

	it("renders back link to the order page", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		const backLink = screen.getByText("Retour").closest("a");
		expect(backLink).toHaveAttribute("href", "/admin/ventes/commandes/order-1");
	});

	// ─── Order items ──────────────────────────────────────────────────────────

	it("renders section title 'Bijoux à rembourser'", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Bijoux à rembourser")).toBeInTheDocument();
	});

	it("renders a RefundItemRow for each order item", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("refund-item-item-1")).toBeInTheDocument();
		expect(screen.getByText("Bague dorée")).toBeInTheDocument();
	});

	it("renders 'Tout sélectionner' button", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Tout sélectionner")).toBeInTheDocument();
	});

	// ─── Reason select ────────────────────────────────────────────────────────

	it("renders the 'Motif du remboursement' section", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Motif du remboursement")).toBeInTheDocument();
	});

	it("renders a Select for refund reason", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("select")).toBeInTheDocument();
	});

	it("renders all refund reason labels as select items", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Rétractation client")).toBeInTheDocument();
		expect(screen.getByText("Produit défectueux")).toBeInTheDocument();
		expect(screen.getByText("Colis perdu")).toBeInTheDocument();
	});

	// ─── Note field ───────────────────────────────────────────────────────────

	it("renders the note textarea", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("note-textarea")).toBeInTheDocument();
	});

	it("renders the note field with an accessible optional label", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		// F1 : le label vit désormais sur le champ (TextareaField), plus dans un CardTitle.
		expect(screen.getByText(/Note/)).toBeInTheDocument();
		expect(screen.getByText(/\(Optionnel\)/)).toBeInTheDocument();
	});

	// ─── Summary ──────────────────────────────────────────────────────────────

	it("renders the 'Récapitulatif' card", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Récapitulatif")).toBeInTheDocument();
	});

	it("shows total refund amount formatted in euros", () => {
		mockFormState.totalAmount = 5000;
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getAllByText(/50\.00 €/).length).toBeGreaterThan(0);
	});

	it("shows 'Déjà remboursé' row in summary", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Déjà remboursé")).toBeInTheDocument();
	});

	it("shows 'Max remboursable' row in summary", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Max remboursable")).toBeInTheDocument();
	});

	// ─── Submit button ────────────────────────────────────────────────────────

	it("renders the submit button with amount", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/Créer la demande/)).toBeInTheDocument();
	});

	it("shows 'Création…' when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Création…")).toBeInTheDocument();
	});

	// ─── Already refunded ─────────────────────────────────────────────────────

	it("calculates maxRefundable correctly (total - alreadyRefunded)", () => {
		const order = createMockOrder({
			total: 10000,
			refunds: [{ amount: 2000 }, { amount: 1000 }],
		});
		render(<CreateRefundForm order={order} />);
		// maxRefundable = 10000 - 3000 = 7000 = 70.00 €
		expect(screen.getByText(/70\.00 €/)).toBeInTheDocument();
	});

	// ─── Excess amount warning ────────────────────────────────────────────────

	it("shows excess warning when totalAmount exceeds maxRefundable", () => {
		mockFormState.totalAmount = 15000;
		const order = createMockOrder({ total: 10000, refunds: [] });
		render(<CreateRefundForm order={order} />);
		expect(screen.getByText(/Le montant dépasse le maximum remboursable/)).toBeInTheDocument();
	});

	it("does not show excess warning when totalAmount is within limit", () => {
		mockFormState.totalAmount = 5000;
		const order = createMockOrder({ total: 10000, refunds: [] });
		render(<CreateRefundForm order={order} />);
		expect(
			screen.queryByText(/Le montant dépasse le maximum remboursable/),
		).not.toBeInTheDocument();
	});

	// ─── Multiple order items ─────────────────────────────────────────────────

	it("renders a RefundItemRow for each order item when multiple items", () => {
		const order = createMockOrder({
			items: [
				{
					id: "item-1",
					productTitle: "Bague dorée",
					productImageUrl: null,
					skuImageUrl: null,
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					price: 5000,
					quantity: 2,
					refundItems: [],
				},
				{
					id: "item-2",
					productTitle: "Collier argent",
					productImageUrl: null,
					skuImageUrl: null,
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					price: 3000,
					quantity: 1,
					refundItems: [],
				},
				{
					id: "item-3",
					productTitle: "Bracelet perles",
					productImageUrl: null,
					skuImageUrl: null,
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					price: 2000,
					quantity: 1,
					refundItems: [],
				},
			],
		});
		render(<CreateRefundForm order={order} />);
		expect(screen.getByTestId("refund-item-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("refund-item-item-2")).toBeInTheDocument();
		expect(screen.getByTestId("refund-item-item-3")).toBeInTheDocument();
		expect(screen.getByText("Bague dorée")).toBeInTheDocument();
		expect(screen.getByText("Collier argent")).toBeInTheDocument();
		expect(screen.getByText("Bracelet perles")).toBeInTheDocument();
	});

	// ─── Selecting items (handleItemToggle) ───────────────────────────────────

	it("passes itemState matching orderItem id to each RefundItemRow", () => {
		mockFormState.items = [{ orderItemId: "item-1", selected: true, quantity: 1, restock: true }];
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("refund-item-item-1")).toBeInTheDocument();
	});

	it("calls form.getFieldValue and form.setFieldValue when RefundItemRow onToggle fires", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: false, quantity: 0, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByTestId("toggle-item-1"));

		expect(mockGetFieldValue).toHaveBeenCalledWith("items");
		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ orderItemId: "item-1", selected: true })]),
		);
	});

	it("calls form.setFieldValue with valid quantity when RefundItemRow onQuantityChange fires", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: true, quantity: 1, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByTestId("qty-item-1"));

		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ orderItemId: "item-1" })]),
		);
	});

	it("calls form.setFieldValue when RefundItemRow onRestockToggle fires", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: true, quantity: 1, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByTestId("restock-item-1"));

		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ orderItemId: "item-1", restock: false })]),
		);
	});

	// ─── handleSelectAll ──────────────────────────────────────────────────────

	it("calls form.getFieldValue and form.setFieldValue when 'Tout sélectionner' is clicked", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: false, quantity: 0, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByText("Tout sélectionner"));

		expect(mockGetFieldValue).toHaveBeenCalledWith("items");
		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ orderItemId: "item-1", selected: true })]),
		);
	});

	it("sets quantity to available quantity when 'Tout sélectionner' is clicked", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: false, quantity: 0, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByText("Tout sélectionner"));

		// getAvailableQuantity mock returns 1 by default
		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ quantity: 1 })]),
		);
	});

	// ─── handleReasonChange ───────────────────────────────────────────────────

	it("recomputes item restock (form.setFieldValue items) when reason changes", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: false, quantity: 0, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.selectOptions(screen.getByTestId("select"), "DEFECTIVE");

		expect(mockSetFieldValue).toHaveBeenCalledWith("items", expect.any(Array));
	});

	it("updates restock on all items when reason changes to a non-restock reason", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: false, quantity: 0, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		// DEFECTIVE → getDefaultRestock returns false
		await user.selectOptions(screen.getByTestId("select"), "DEFECTIVE");

		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([expect.objectContaining({ restock: false })]),
		);
	});

	// F4 : un toggle restock manuel marque restockTouched pour protéger l'override.
	it("flags restockTouched when onRestockToggle fires (F4)", async () => {
		const user = userEvent.setup();
		const currentItems = [{ orderItemId: "item-1", selected: true, quantity: 1, restock: true }];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		await user.click(screen.getByTestId("restock-item-1"));

		expect(mockSetFieldValue).toHaveBeenCalledWith(
			"items",
			expect.arrayContaining([
				expect.objectContaining({ orderItemId: "item-1", restock: false, restockTouched: true }),
			]),
		);
	});

	// F4 : changer de motif ne doit PAS écraser le restock d'un bijou touché manuellement.
	it("preserves manually-toggled restock when reason changes (F4)", async () => {
		const user = userEvent.setup();
		const currentItems = [
			{ orderItemId: "item-1", selected: true, quantity: 1, restock: true, restockTouched: true },
			{ orderItemId: "item-2", selected: true, quantity: 1, restock: true },
		];
		mockGetFieldValue.mockReturnValue(currentItems);

		render(<CreateRefundForm order={createMockOrder()} />);
		// DEFECTIVE → getDefaultRestock renvoie false
		await user.selectOptions(screen.getByTestId("select"), "DEFECTIVE");

		const updatedItems = mockSetFieldValue.mock.calls
			.filter(([field]) => field === "items")
			.at(-1)?.[1] as { orderItemId: string; restock: boolean }[];
		const item1 = updatedItems.find((i) => i.orderItemId === "item-1");
		const item2 = updatedItems.find((i) => i.orderItemId === "item-2");
		// item-1 (touché) garde son restock=true ; item-2 (non touché) passe au défaut=false
		expect(item1?.restock).toBe(true);
		expect(item2?.restock).toBe(false);
	});

	it("shows 'Stock restauré par défaut' hint when reason is CUSTOMER_REQUEST", () => {
		mockFormState.reason = "CUSTOMER_REQUEST";
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/Stock restauré par défaut/)).toBeInTheDocument();
	});

	it("shows 'Stock non restauré par défaut' hint when getDefaultRestock returns false", () => {
		// getDefaultRestock returns false for non-CUSTOMER_REQUEST reasons
		mockFormState.reason = "DEFECTIVE";
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/Stock non restauré par défaut/)).toBeInTheDocument();
	});

	// ─── Note textarea ────────────────────────────────────────────────────────

	it("renders textarea with current note value from store", () => {
		mockFormState.note = "Note existante";
		render(<CreateRefundForm order={createMockOrder()} />);
		const textarea = screen.getByTestId("note-textarea");
		expect(textarea).toHaveValue("Note existante");
	});

	it("renders textarea with placeholder text", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByPlaceholderText("Détails supplémentaires…")).toBeInTheDocument();
	});

	it("disables note textarea when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByTestId("note-textarea")).toBeDisabled();
	});

	// ─── Submit button disabled state ─────────────────────────────────────────

	it("keeps submit button enabled when canSubmitRefund returns false so validation can surface (F2)", () => {
		// F2 : le bouton n'est plus désactivé sur l'état invalide — un clic déclenche
		// form.handleSubmit() qui incrémente submissionAttempts et affiche l'ErrorSummary.
		vi.mocked(canSubmitRefund).mockReturnValue(false);
		mockIsPending.value = false;
		render(<CreateRefundForm order={createMockOrder()} />);
		const submitBtn = screen.getByRole("button", { name: /Créer la demande/ });
		expect(submitBtn).not.toBeDisabled();
	});

	it("enables submit button when canSubmitRefund returns true", () => {
		vi.mocked(canSubmitRefund).mockReturnValue(true);
		mockIsPending.value = false;
		render(<CreateRefundForm order={createMockOrder()} />);
		const submitBtn = screen.getByRole("button", { name: /Créer la demande/ });
		expect(submitBtn).not.toBeDisabled();
	});

	it("disables submit button when isPending is true regardless of canSubmit", () => {
		mockIsPending.value = true;
		render(<CreateRefundForm order={createMockOrder()} />);
		// When pending, button shows "Création…" and is disabled
		const pendingBtn = screen.getByRole("button", { name: "Création…" });
		expect(pendingBtn).toBeDisabled();
	});

	// ─── Submit form (hidden fields) ──────────────────────────────────────────

	it("renders hidden field for orderId", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		const hiddenOrderId = document.querySelector('input[name="orderId"]') as HTMLInputElement;
		expect(hiddenOrderId).not.toBeNull();
		expect(hiddenOrderId.value).toBe("order-1");
	});

	it("renders hidden field for items as JSON of itemsForAction", () => {
		mockFormState.itemsForAction = [{ orderItemId: "item-1", quantity: 1, restock: true }];
		render(<CreateRefundForm order={createMockOrder()} />);
		const hiddenItems = document.querySelector('input[name="items"]') as HTMLInputElement;
		expect(hiddenItems).not.toBeNull();
		expect(JSON.parse(hiddenItems.value)).toEqual([
			{ orderItemId: "item-1", quantity: 1, restock: true },
		]);
	});

	it("does not render a separate hidden input for reason (submitted by the SelectField)", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(document.querySelector('input[type="hidden"][name="reason"]')).toBeNull();
	});

	// ─── Selected items count in summary ─────────────────────────────────────

	it("shows selected items count of 0 when no items are selected", () => {
		mockFormState.selectedItems = [];
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Bijoux sélectionnés")).toBeInTheDocument();
		const summarySection = screen.getByText("Bijoux sélectionnés").closest("div");
		expect(summarySection?.textContent).toContain("0");
	});

	it("shows selected items count when items are selected", () => {
		mockFormState.selectedItems = [
			{ orderItemId: "item-1", selected: true, quantity: 1, restock: true },
			{ orderItemId: "item-2", selected: true, quantity: 2, restock: false },
		];
		render(<CreateRefundForm order={createMockOrder()} />);
		const summarySection = screen.getByText("Bijoux sélectionnés").closest("div");
		expect(summarySection?.textContent).toContain("2");
	});

	// ─── Partial vs full refund ───────────────────────────────────────────────

	it("shows 0.00 € as already refunded when order has no refunds", () => {
		const order = createMockOrder({ total: 10000, refunds: [] });
		render(<CreateRefundForm order={order} />);
		// alreadyRefunded = 0, maxRefundable = 10000 = 100.00 €
		expect(screen.getByText(/100\.00 €/)).toBeInTheDocument();
	});

	it("shows reduced maxRefundable for partial refund (one prior refund)", () => {
		const order = createMockOrder({
			total: 10000,
			refunds: [{ amount: 3000 }],
		});
		render(<CreateRefundForm order={order} />);
		// maxRefundable = 10000 - 3000 = 7000 = 70.00 €
		expect(screen.getByText(/70\.00 €/)).toBeInTheDocument();
	});

	it("shows zero maxRefundable when order is fully refunded", () => {
		const order = createMockOrder({
			total: 10000,
			refunds: [{ amount: 10000 }],
		});
		render(<CreateRefundForm order={order} />);
		// maxRefundable = 0
		expect(screen.getAllByText(/0\.00 €/).length).toBeGreaterThan(0);
	});

	it("shows correct alreadyRefunded amount across multiple refunds", () => {
		const order = createMockOrder({
			total: 20000,
			refunds: [{ amount: 5000 }, { amount: 3000 }, { amount: 2000 }],
		});
		render(<CreateRefundForm order={order} />);
		// alreadyRefunded = 10000 = 100.00 €, maxRefundable = 10000 = 100.00 €
		expect(screen.getAllByText(/100\.00 €/).length).toBeGreaterThanOrEqual(2);
	});

	// ─── Reason select current value ─────────────────────────────────────────

	it("renders Select with current reason value", () => {
		mockFormState.reason = "LOST_IN_TRANSIT";
		render(<CreateRefundForm order={createMockOrder()} />);
		const selectEl = screen.getByTestId("select");
		expect(selectEl).toHaveAttribute("data-value", "LOST_IN_TRANSIT");
	});

	it("disables reason Select when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateRefundForm order={createMockOrder()} />);
		const selectEl = screen.getByTestId("select");
		expect(selectEl).toHaveAttribute("data-disabled", "true");
	});

	it("enables reason Select when isPending is false", () => {
		mockIsPending.value = false;
		render(<CreateRefundForm order={createMockOrder()} />);
		const selectEl = screen.getByTestId("select");
		expect(selectEl).toHaveAttribute("data-disabled", "false");
	});

	// ─── Cancelled order confirmation (ORD-REFUND-AUDIT-003) ──────────────────

	it("renders the cancelled-order confirmation checkbox when order is CANCELLED", () => {
		render(<CreateRefundForm order={createMockOrder({ status: "CANCELLED" })} />);
		expect(screen.getByTestId("accept-cancelled")).toBeInTheDocument();
		expect(screen.getByText(/Cette commande est annulée/)).toBeInTheDocument();
	});

	it("does not render the cancelled-order confirmation for a non-cancelled order", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.queryByTestId("accept-cancelled")).not.toBeInTheDocument();
	});

	// ─── Submit button amount label ───────────────────────────────────────────

	it("shows base 'Créer la demande' label when totalAmount is 0", () => {
		mockFormState.totalAmount = 0;
		mockFormState.selectedItems = [];
		render(<CreateRefundForm order={createMockOrder()} />);
		const submitBtn = screen.getByRole("button", { name: /Créer la demande/ });
		expect(submitBtn.textContent).not.toContain("·");
	});

	it("shows formatted amount in submit button label when items are selected", () => {
		mockFormState.totalAmount = 7500;
		mockFormState.selectedItems = [
			{ orderItemId: "item-1", selected: true, quantity: 1, restock: true },
		];
		render(<CreateRefundForm order={createMockOrder()} />);
		const submitBtn = screen.getByRole("button", { name: /Créer la demande/ });
		expect(submitBtn.textContent).toMatch(/75[.,]00\s*€/);
	});

	// ─── Pending information text ─────────────────────────────────────────────

	it("renders the informational note about refund approval process", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText(/remboursement traité sous 48h/)).toBeInTheDocument();
	});

	// ─── Form section descriptions ────────────────────────────────────────────

	it("renders the items card description", () => {
		render(<CreateRefundForm order={createMockOrder()} />);
		expect(screen.getByText("Choisis ce qui retourne à l'atelier.")).toBeInTheDocument();
	});
});
