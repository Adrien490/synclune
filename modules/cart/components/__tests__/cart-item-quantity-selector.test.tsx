import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockCartOptimistic, mockHaptic } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockCartOptimistic: { value: null as null | { updateOptimisticCart: ReturnType<typeof vi.fn> } },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/cart/hooks/use-update-cart-item", () => ({
	useUpdateCartItem: () => ({
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("../contexts/cart-optimistic-context", () => ({
	useCartOptimisticSafe: () => mockCartOptimistic.value,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
	}) => <div aria-label={ariaLabel}>{children}</div>,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		value,
		onChange,
		onBlur,
		disabled,
		min,
		max,
		"aria-label": ariaLabel,
		...props
	}: {
		value: number;
		onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
		onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
		disabled?: boolean;
		min?: number;
		max?: number;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<input
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			min={min}
			max={max}
			aria-label={ariaLabel}
			data-testid="quantity-input"
			{...props}
		/>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	MinusIcon: () => <svg data-testid="minus-icon" />,
	PlusIcon: () => <svg data-testid="plus-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartItemQuantitySelector } from "../cart-item-quantity-selector";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	mockCartOptimistic.value = null;
});

function renderSelector(
	overrides: Partial<React.ComponentProps<typeof CartItemQuantitySelector>> = {},
) {
	const props = {
		variantId: "item-1",
		currentQuantity: 2,
		maxQuantity: 5,
		isInactive: false,
		itemName: "Papilloux Duo Symétrie",
		...overrides,
	};
	return render(<CartItemQuantitySelector {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartItemQuantitySelector", () => {
	it("renders null when maxQuantity is 1 or less", () => {
		const { container } = renderSelector({ maxQuantity: 1 });
		expect(container.firstChild).toBeNull();
	});

	it("renders quantity input with current quantity value", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toBeInTheDocument();
		// Input renders optimistic quantity as a string attribute
		expect((input as HTMLInputElement).value).toBe("3");
	});

	it("renders increment and decrement buttons", () => {
		renderSelector();
		expect(screen.getByLabelText(/Augmenter la quantité de /)).toBeInTheDocument();
		expect(screen.getByLabelText(/Diminuer la quantité de /)).toBeInTheDocument();
	});

	/**
	 * @regression cart-quantity-buttons-named-per-item-2026-08-07
	 *
	 * ⚠️ Les deux boutons s'appelaient « Diminuer la quantité » / « Augmenter la
	 * quantité » **à l'identique sur toutes les lignes** du panier. En lecture
	 * linéaire le contexte existe (l'`<article>` de la ligne porte le titre), mais
	 * dans un rotor « boutons » — la façon dont on navigue réellement un panier —
	 * les paires étaient indiscernables. Le bouton Supprimer, lui, était déjà nommé
	 * par article : c'est cette cohérence qu'on rétablit.
	 */
	it("nomme chaque commande PAR ARTICLE (rotor « boutons »)", () => {
		renderSelector({ itemName: "Bague Étoile", currentQuantity: 2, maxQuantity: 5 });

		for (const label of [
			screen.getByLabelText(/Augmenter la quantité de /),
			screen.getByLabelText(/Diminuer la quantité de /),
		]) {
			expect(label.getAttribute("aria-label")).toContain("Bague Étoile");
		}

		// Le groupe aussi : « Quantité de l'article » ne distinguait rien.
		expect(
			screen.getByRole("group", { name: /Quantité de / }).getAttribute("aria-label"),
		).toContain("Bague Étoile");
	});

	it("nomme aussi les états de borne par article", () => {
		renderSelector({ itemName: "Bague Étoile", currentQuantity: 1, maxQuantity: 5 });
		expect(
			screen.getByLabelText(/Quantité minimale atteinte pour /).getAttribute("aria-label"),
		).toContain("Bague Étoile");
	});

	it("disables decrement button when quantity is at minimum (1)", () => {
		renderSelector({ currentQuantity: 1, maxQuantity: 5 });
		const decrementBtn = screen.getByLabelText(/Quantité minimale atteinte pour /);
		expect(decrementBtn).toBeDisabled();
	});

	it("disables increment button when quantity is at maximum", () => {
		renderSelector({ currentQuantity: 5, maxQuantity: 5 });
		const incrementBtn = screen.getByLabelText(/Quantité maximale atteinte pour /);
		expect(incrementBtn).toBeDisabled();
	});

	it("calls action when increment button is clicked", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const incrementBtn = screen.getByLabelText(/Augmenter la quantité de /);
		fireEvent.click(incrementBtn);
		expect(mockAction).toHaveBeenCalled();
	});

	it("calls action when decrement button is clicked", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		const decrementBtn = screen.getByLabelText(/Diminuer la quantité de /);
		fireEvent.click(decrementBtn);
		expect(mockAction).toHaveBeenCalled();
	});

	it("disables all controls when isInactive is true", () => {
		renderSelector({ isInactive: true, currentQuantity: 2, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toBeDisabled();
	});

	it("has accessible group label with current quantity", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de .+, actuellement 2/ });
		expect(group).toBeInTheDocument();
	});

	it("marks the group as not busy when idle", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de / });
		expect(group).toHaveAttribute("aria-busy", "false");
	});

	it("marks the group as busy while a quantity update is pending", () => {
		mockIsPending.value = true;
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const group = screen.getByRole("group", { name: /Quantité de / });
		expect(group).toHaveAttribute("aria-busy", "true");
	});

	/**
	 * @regression group-has-pending-on-self-2026-08-05
	 *
	 * `data-pending` est le jumeau de STYLE d'`aria-busy` : c'est lui qui alimente les
	 * variantes `group-has-[[data-pending]]/item:` de `cart-sheet-item-row.tsx` (vignette,
	 * titre, et surtout le PRIX). Elles n'avaient aucun producteur, donc le prix de la
	 * ligne — la seule valeur qui change au tap de quantité — ne signalait rien.
	 *
	 * Les deux attributs doivent bouger ENSEMBLE : `aria-busy` seul rend l'état au lecteur
	 * d'écran et à personne d'autre, ce qui était exactement le symptôme.
	 */
	it("publie `data-pending` exactement quand `aria-busy` est vrai", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		expect(screen.getByRole("group", { name: /Quantité de / })).not.toHaveAttribute("data-pending");

		cleanup();
		mockIsPending.value = true;
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		const busy = screen.getByRole("group", { name: /Quantité de / });
		expect(busy).toHaveAttribute("aria-busy", "true");
		expect(busy).toHaveAttribute("data-pending", "");
	});

	it("input has correct aria-label with min and max bounds", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 8 });
		const input = screen.getByTestId("quantity-input");
		expect(input).toHaveAttribute("aria-label", "Quantité, entre 1 et 8");
	});

	it("triggers selection haptic when incrementing", () => {
		renderSelector({ currentQuantity: 2, maxQuantity: 5 });
		fireEvent.click(screen.getByLabelText(/Augmenter la quantité de /));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers selection haptic when decrementing", () => {
		renderSelector({ currentQuantity: 3, maxQuantity: 5 });
		fireEvent.click(screen.getByLabelText(/Diminuer la quantité de /));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers error haptic when typed value is clamped against a limit", () => {
		renderSelector({ currentQuantity: 5, maxQuantity: 5 });
		const input = screen.getByTestId("quantity-input");
		// User types a value higher than max — clamp brings it back to 5, same as current
		fireEvent.change(input, { target: { value: "99" } });
		expect(mockHaptic).toHaveBeenCalledWith("error");
	});
});
