/**
 * @regression ORD-UI-001 + ORD-UI-002
 *
 * 1. Le dialog MarkAsShippedDialog NE DOIT PAS pouvoir être fermé
 *    (click outside / Escape) pendant que la mutation est en cours
 *    (`isPending=true`). Pattern aligné sur `cancel-order-alert-dialog`
 *    (`!open && !isPending`). Avant : un click outside cassait le
 *    feedback visuel sans annuler la Server Action.
 *
 * 2. Le bouton submit doit porter `aria-busy="true"` + un spinner
 *    `LoaderCircle` visible pendant la mutation (a11y screen-reader
 *    et UX desktop). Avant : seul le label changeait — invisible.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockUseMarkAsShippedForm, mockUseStore, capturedOpenChange } = vi.hoisted(
	() => ({
		mockDialog: {
			isOpen: true,
			data: {
				orderId: "ord-1",
				orderNumber: "ORD-001",
			} as { orderId: string; orderNumber: string; [k: string]: unknown } | null,
			open: vi.fn(),
			close: vi.fn(),
		},
		mockUseMarkAsShippedForm: vi.fn(),
		mockUseStore: vi.fn(),
		capturedOpenChange: { current: null as ((open: boolean) => void) | null },
	}),
);

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-shipped-form", () => ({
	useMarkAsShippedForm: mockUseMarkAsShippedForm,
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: mockUseStore,
}));

// Mock ResponsiveDialog pour capturer `onOpenChange` et toujours
// rendre les enfants (pas de portal Vaul/Radix en jsdom).
vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}) => {
		capturedOpenChange.current = onOpenChange;
		return open ? <div data-testid="responsive-dialog">{children}</div> : null;
	},
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { MarkAsShippedDialog } from "../mark-as-shipped-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function setupForm({ isPending }: { isPending: boolean }) {
	mockUseMarkAsShippedForm.mockReturnValue({
		form: { store: {}, setFieldValue: vi.fn() },
		state: undefined,
		action: vi.fn(),
		isPending,
		formErrors: [],
	});
	mockUseStore.mockImplementation((_store: unknown, selector: (s: unknown) => unknown) =>
		selector({
			values: {
				trackingNumber: "8N00234567890",
				carrier: "colissimo",
				trackingUrl: "https://laposte.fr/8N00234567890",
				sendEmail: true,
				customUrlMode: false,
			},
		}),
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("MarkAsShippedDialog [@regression ORD-UI-001 + ORD-UI-002]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "ord-1", orderNumber: "ORD-001" };
		capturedOpenChange.current = null;
	});

	afterEach(cleanup);

	it("ORD-UI-001 — ne ferme PAS le dialog quand `isPending=true` et `onOpenChange(false)`", () => {
		setupForm({ isPending: true });
		render(<MarkAsShippedDialog />);

		// Le wrapper a lifté isPending=true via le useEffect onPendingChange.
		// Simuler Escape / click outside.
		expect(capturedOpenChange.current).not.toBeNull();
		capturedOpenChange.current?.(false);

		expect(mockDialog.close).not.toHaveBeenCalled();
	});

	it("ORD-UI-001 — ferme le dialog quand `isPending=false` et `onOpenChange(false)`", () => {
		setupForm({ isPending: false });
		render(<MarkAsShippedDialog />);

		expect(capturedOpenChange.current).not.toBeNull();
		capturedOpenChange.current?.(false);

		expect(mockDialog.close).toHaveBeenCalledTimes(1);
	});

	it("ORD-UI-002 — bouton submit porte `aria-busy=true` pendant la mutation", () => {
		setupForm({ isPending: true });
		render(<MarkAsShippedDialog />);

		const submit = screen.getByRole("button", { name: /Expédition…/i });
		expect(submit).toHaveAttribute("aria-busy", "true");
	});

	it("ORD-UI-002 — bouton submit affiche un spinner LoaderCircle pendant la mutation", () => {
		setupForm({ isPending: true });
		const { container } = render(<MarkAsShippedDialog />);

		// LoaderCircle reçoit `motion-safe:animate-spin` — présence du svg suffit
		const spinner = container.querySelector("svg.motion-safe\\:animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	it("ORD-UI-002 — bouton submit NE porte PAS `aria-busy=true` au repos", () => {
		setupForm({ isPending: false });
		render(<MarkAsShippedDialog />);

		const submit = screen.getByRole("button", { name: /Valider l'expédition/i });
		// React passe `aria-busy={false}` ⇒ pas d'attribut OU "false"
		const ariaBusy = submit.getAttribute("aria-busy");
		expect(ariaBusy === null || ariaBusy === "false").toBe(true);
	});
});
