import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

/**
 * @regression autocomplete-debounce-select-race-2026-08-03
 *
 * Trois défauts corrigés ensemble (audit UI/UX autocomplete 2026-08-03), tous
 * dans le chemin critique checkout (champ adresse) :
 *
 * 1. **Race debounce ↔ sélection** — `handleItemSelect` n'annulait pas le
 *    debounce en vol : liste affichée pour « 12 ru », l'utilisateur tape
 *    « e » (timer 300 ms armé) puis clique une suggestion → `onSelect` écrit
 *    l'adresse complète → le timer fire `onChange("12 rue")` et re-clobber
 *    `addressLine1` avec le fragment tapé (postalCode/city gardaient eux les
 *    valeurs sélectionnées → adresse incohérente).
 *
 * 2. **Containment blur** — `handleBlur` testait
 *    `currentTarget.parentElement.contains(document.activeElement)` : or le
 *    listbox est un sibling du wrapper interne de l'Input, jamais contenu.
 *    Cliquer « Réessayer » fermait le dropdown pendant le retry. Fix :
 *    containment sur le conteneur racine + preventDefault sur mousedown dans
 *    le listbox (l'input garde le focus pendant toute interaction dedans).
 *
 * 3. **Debounce non flushé au blur** — soumettre le formulaire < 300 ms après
 *    la dernière frappe lisait une valeur stale.
 */

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile, mockMounted, mockHaptic } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
	mockMounted: { value: true },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: () => mockMounted.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("motion/react", () => {
	const { createElement, forwardRef } = require("react");

	const m = new Proxy(
		{},
		{
			get: (_target, tag: string) => {
				const Component = forwardRef(
					(
						{
							children,
							initial: _i,
							animate: _a,
							exit: _e,
							transition: _t,
							...props
						}: Record<string, unknown> & { children?: unknown },
						ref: unknown,
					) => createElement(tag, { ref, ...props }, children),
				);
				Component.displayName = `m.${tag}`;
				return Component;
			},
		},
	);

	function AnimatePresence({ children }: { children?: unknown }) {
		return createElement("div", { "data-testid": "animate-presence" }, children);
	}

	function MotionConfig({ children }: { children?: unknown }) {
		return createElement("div", { "data-testid": "motion-config" }, children);
	}

	return { m, AnimatePresence, MotionConfig };
});

vi.mock("next/image", () => {
	const { createElement } = require("react");
	return {
		default: ({ src, alt, className }: Record<string, unknown>) =>
			createElement("img", { src, alt, className, "data-testid": "next-image" }),
	};
});

vi.mock("@/shared/components/ui/spinner", () => {
	const { createElement } = require("react");
	return {
		Spinner: ({ className }: { className?: string }) =>
			createElement("span", { "data-testid": "spinner", className }),
	};
});

vi.mock("@/shared/components/ui/skeleton", () => {
	const { createElement } = require("react");
	return {
		Skeleton: ({ className, style }: { className?: string; style?: Record<string, unknown> }) =>
			createElement("span", { "data-testid": "skeleton", className, style }),
	};
});

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				onClick,
				...props
			}: Record<string, unknown> & { children?: unknown; onClick?: () => void },
			ref: unknown,
		) => createElement("button", { ref, onClick, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("@/shared/components/ui/empty", () => {
	const { createElement } = require("react");
	return {
		Empty: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty" }, children),
		EmptyHeader: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty-header" }, children),
		EmptyMedia: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty-media" }, children),
		EmptyTitle: ({ children, className }: { children?: unknown; className?: string }) =>
			createElement("p", { "data-testid": "empty-title", className }, children),
		EmptyDescription: ({ children }: { children?: unknown }) =>
			createElement("p", { "data-testid": "empty-description" }, children),
	};
});

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		SearchIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "search-icon", ...props }),
		AlertCircleIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "alert-icon", ...props }),
		X: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "x-icon", ...props }),
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { Autocomplete } from "../autocomplete";

// ============================================================================
// FIXTURES
// ============================================================================

type TestItem = { id: string; label: string };

const SUGGESTIONS: TestItem[] = [
	{ id: "1", label: "12 Rue de la Paix" },
	{ id: "2", label: "12 Rue des Lilas" },
];

const DEFAULT_PROPS = {
	name: "address",
	value: "",
	onChange: vi.fn(),
	onSelect: vi.fn(),
	items: SUGGESTIONS,
	getItemLabel: (item: TestItem) => item.label,
	getItemKey: (item: TestItem) => item.id,
	minQueryLength: 2,
	debounceMs: 300,
};

function renderAutocomplete(props: Partial<typeof DEFAULT_PROPS> & Record<string, unknown> = {}) {
	return render(<Autocomplete {...DEFAULT_PROPS} {...props} />);
}

function getInput() {
	return screen.getByRole("combobox");
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	mockIsMobile.value = false;
	mockMounted.value = true;
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
	vi.useRealTimers();
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("Race debounce ↔ sélection", () => {
	it("la sélection annule le debounce en vol : aucun onChange stale après onSelect", () => {
		const onChange = vi.fn();
		const onSelect = vi.fn();
		renderAutocomplete({ onChange, onSelect });

		// L'utilisateur tape — debounce armé, dropdown ouvert.
		fireEvent.change(getInput(), { target: { value: "12 rue" } });
		expect(onChange).not.toHaveBeenCalled();

		// Clic sur une suggestion AVANT que le timer fire.
		fireEvent.click(screen.getAllByRole("option")[0]!);
		expect(onSelect).toHaveBeenCalledWith(SUGGESTIONS[0]);

		// Le timer ne doit JAMAIS fire : sinon onChange("12 rue") re-clobber
		// la valeur écrite par onSelect dans le formulaire parent.
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("le blur flush le debounce en vol : le formulaire lit la valeur à jour", () => {
		const onChange = vi.fn();
		renderAutocomplete({ onChange });

		fireEvent.change(getInput(), { target: { value: "12 rue" } });
		expect(onChange).not.toHaveBeenCalled();

		// Blur avant l'échéance du timer (ex : Tab vers le champ suivant puis
		// soumission immédiate) → flush synchrone, pas d'attente de 300 ms.
		fireEvent.blur(getInput());
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("12 rue");

		// Et le timer annulé ne double pas l'appel.
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe("Containment blur (listbox est un sibling de l'Input)", () => {
	it("cliquer « Réessayer » ne ferme pas le dropdown (focus dans le conteneur)", () => {
		const onRetry = vi.fn();
		renderAutocomplete({
			value: "12 rue",
			items: [],
			error: "La recherche a échoué",
			onRetry,
			debounceMs: 0,
		});

		fireEvent.focus(getInput());
		expect(screen.getByRole("listbox")).toBeInTheDocument();

		// Le focus passe au bouton Réessayer (dans le listbox) — l'ancien check
		// `parentElement` ne le contenait pas et fermait après blurDelay.
		const retryButton = screen.getByRole("button", { name: /Réessayer/i });
		act(() => {
			retryButton.focus();
		});
		fireEvent.blur(getInput());

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(screen.getByRole("listbox")).toBeInTheDocument();
		fireEvent.click(retryButton);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("un blur réellement sortant ferme toujours le dropdown", () => {
		renderAutocomplete({ value: "12 rue", debounceMs: 0 });

		fireEvent.focus(getInput());
		expect(screen.getByRole("listbox")).toBeInTheDocument();

		// Focus parti hors du composant (document.body).
		fireEvent.blur(getInput());
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("mousedown sur une option est default-prevented (l'input garde le focus), pas sur le <ul> (scrollbar)", () => {
		renderAutocomplete({ value: "12 rue", debounceMs: 0 });
		fireEvent.focus(getInput());

		// fireEvent renvoie false quand preventDefault a été appelé.
		const option = screen.getAllByRole("option")[0]!;
		expect(fireEvent.mouseDown(option)).toBe(false);

		// Le <ul> lui-même reste libre : préserver le drag de sa scrollbar.
		const listbox = screen.getByRole("listbox");
		expect(fireEvent.mouseDown(listbox)).toBe(true);
	});
});
