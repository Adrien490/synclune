import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockUpdatePrice, mockPush } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockUpdatePrice: vi.fn(),
	mockPush: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	data: {
		variantId: string;
		variantName: string;
		currentPrice: number;
		currentCompareAtPrice: number | null;
	} | null;
	close: typeof mockClose;
} = {
	isOpen: false,
	data: null,
	close: mockClose,
};

let mockIsPending = false;

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/modules/variants/hooks/use-update-variant-price", () => ({
	useUpdateVariantPrice: () => ({
		updatePrice: mockUpdatePrice,
		isPending: mockIsPending,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (fn: () => void) => fn(),
}));

vi.mock("@/shared/components/admin-form-footer", () => ({
	AdminFormFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: Record<string, unknown>) => <input data-testid="input" {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SpinnerIcon: () => <span data-testid="icon-loader" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

import { UpdatePriceDialog } from "../update-price-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("UpdatePriceDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: false,
			data: null,
			close: mockClose,
		};
	});

	// ─── Closed state ─────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		render(<UpdatePriceDialog />);

		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	it("renders dialog when open", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("shows 'Modifier le prix' title when open", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Modifier le prix")).toBeInTheDocument();
	});

	it("displays variant name in description", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		const matches = screen.getAllByText("Bague Or - T52");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	it("renders price input", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByLabelText("Prix final (€)")).toBeInTheDocument();
	});

	it("renders compare at price input", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByLabelText("Prix barré (optionnel)")).toBeInTheDocument();
	});

	it("renders save submit button", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Enregistrement…' when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};
		mockIsPending = true;

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Enregistrement…")).toBeInTheDocument();
	});

	it("disables submit button when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				variantId: "variant_1",
				variantName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};
		mockIsPending = true;

		render(<UpdatePriceDialog />);

		const submitBtn = screen.getByText("Enregistrement…").closest("button");
		expect(submitBtn).toBeDisabled();
	});
});
