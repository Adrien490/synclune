import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { createRef } from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockReplace, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockReplace: vi.fn(),
	mockSearchParams: {
		get: vi.fn().mockReturnValue(null),
		toString: vi.fn().mockReturnValue(""),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		MotionConfig: ({ children }: { children: unknown }) => children,
		m: {
			span: fRef(
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
				) => {
					const { createElement } = require("react");
					return createElement("span", { ref, ...props }, children);
				},
			),
			div: fRef(
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
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: vi.fn(() => false),
	};
});

vi.mock("@/shared/components/loaders/mini-dots-loader", () => ({
	MiniDotsLoader: () => {
		const { createElement } = require("react");
		return createElement("span", { "data-testid": "mini-dots-loader" });
	},
}));

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("@/shared/components/ui/input", () => {
	const { forwardRef, createElement } = require("react");
	const Input = forwardRef(({ ...props }: Record<string, unknown>, ref: unknown) =>
		createElement("input", { ref, ...props }),
	);
	Input.displayName = "Input";
	return { Input };
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		Search: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "search-icon", ...props }),
		X: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "x-icon", ...props }),
	};
});

/**
 * Mock minimal d'`useAppForm`.
 *
 * ⚠️ `AppField` et `Subscribe` doivent avoir une identité **stable** entre les
 * rendus, comme le vrai `form.AppField`. Une version qui recrée la fonction à
 * chaque rendu fait remonter le sous-arbre par React : le `<input>` est remplacé
 * par un nœud NEUF, ce qui (a) perd le focus — rendant intestable toute logique
 * de focus/blur — et (b) détache les handlers du nœud capturé par le test, si
 * bien qu'un `fireEvent.keyDown` sur la référence gardée ne déclenche plus rien.
 * D'où le couple ref + `forceRender`. Cf. le principe déjà noté sur cet audit :
 * un mock plus permissif que le vrai composant masque des bugs.
 */
vi.mock("@/shared/components/forms", () => {
	const { useState, useRef, useReducer } = require("react");

	function useAppForm({ defaultValues }: { defaultValues: { search: string } }) {
		const valueRef = useRef(defaultValues.search);
		const [, forceRender] = useReducer((x: number) => x + 1, 0);

		const setValue = (v: string) => {
			valueRef.current = v;
			forceRender();
		};

		const [AppField] = useState(
			() =>
				function AppField({
					children,
					validators,
				}: {
					children: (field: {
						state: { value: string };
						handleChange: (v: string) => void;
					}) => unknown;
					validators?: {
						onChangeAsync?: (opts: { value: string }) => Promise<undefined>;
					};
					name: string;
				}) {
					return children({
						state: { value: valueRef.current },
						handleChange: (v: string) => {
							setValue(v);
							// Invoke onChangeAsync if provided (simulate debounce immediately)
							void validators?.onChangeAsync?.({ value: v });
						},
					}) as unknown;
				},
		);

		const [Subscribe] = useState(
			() =>
				function Subscribe({
					selector,
					children,
				}: {
					selector: (state: { values: { search: string } }) => string;
					children: (v: string) => unknown;
				}) {
					return children(selector({ values: { search: valueRef.current } })) as unknown;
				},
		);

		return {
			AppField,
			Subscribe,
			setFieldValue: (_name: string, v: string) => setValue(v),
			getFieldValue: (_name: string) => valueRef.current,
		};
	}

	return { useAppForm };
});

// Import AFTER mocks
import { SearchInput, type SearchInputHandle } from "../search-input";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchParams.get.mockReturnValue(null);
	mockSearchParams.toString.mockReturnValue("");
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SearchInput", () => {
	it("renders a search form", () => {
		render(<SearchInput paramName="q" />);

		expect(screen.getByRole("search")).toBeInTheDocument();
	});

	it("renders with custom placeholder", () => {
		render(<SearchInput paramName="q" placeholder="Trouver un produit" />);

		expect(screen.getByPlaceholderText("Trouver un produit")).toBeInTheDocument();
	});

	it("uses default placeholder when none provided", () => {
		render(<SearchInput paramName="q" />);

		expect(screen.getByPlaceholderText("Rechercher…")).toBeInTheDocument();
	});

	it("shows clear button when input has a value", () => {
		render(<SearchInput paramName="q" />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "bracelet" } });

		expect(screen.getByRole("button", { name: "Effacer la recherche" })).toBeInTheDocument();
	});

	it("clears the input when clear button is clicked", () => {
		const onValueChange = vi.fn();
		render(<SearchInput paramName="q" onValueChange={onValueChange} />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "collier" } });

		const clearButton = screen.getByRole("button", { name: "Effacer la recherche" });
		fireEvent.click(clearButton);

		// onValueChange called with empty string signals input was cleared
		expect(onValueChange).toHaveBeenLastCalledWith("");
	});

	it("calls onValueChange when input value changes", () => {
		const onValueChange = vi.fn();
		render(<SearchInput paramName="q" onValueChange={onValueChange} />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "bague" } });

		expect(onValueChange).toHaveBeenCalledWith("bague");
	});

	it("announces the pending state in the live region", () => {
		render(<SearchInput paramName="q" isPending />);

		expect(screen.getByRole("status")).toHaveTextContent("Recherche en cours…");
	});

	// Régression P0 (audit 2026-05-20) : `SearchInput` doit consommer l'attribut DOM
	// standard `aria-label`. Un consommateur réflexe écrivant `aria-label="…"` ne doit
	// PAS se retrouver avec un champ sans nom accessible (cf bug QuickSearchDialog).
	it("uses the standard aria-label attribute as the accessible name", () => {
		render(<SearchInput paramName="q" aria-label="Rechercher des bijoux" />);

		expect(screen.getByLabelText("Rechercher des bijoux")).toBeInTheDocument();
	});

	/**
	 * Escape en deux temps — contrat dont dépend le test E2E « Escape ferme le
	 * dialog » : la 1ʳᵉ pression efface seulement (et stoppe la propagation, sinon
	 * le `DismissableLayer` de Radix fermerait le dialog), la 2ᵈᵉ ferme.
	 * 419 lignes de composant pour 8 tests : ce comportement, le plus subtil du
	 * fichier, n'était couvert nulle part.
	 */
	describe("Escape en deux temps", () => {
		it("efface la valeur sans appeler onEscape à la première pression", () => {
			const onEscape = vi.fn();
			render(<SearchInput paramName="q" onEscape={onEscape} />);

			const input = screen.getByRole("searchbox");
			fireEvent.change(input, { target: { value: "bague" } });
			fireEvent.keyDown(input, { key: "Escape" });

			expect(screen.getByRole("searchbox")).toHaveValue("");
			expect(onEscape).not.toHaveBeenCalled();
		});

		it("appelle onEscape quand le champ est déjà vide", () => {
			const onEscape = vi.fn();
			render(<SearchInput paramName="q" onEscape={onEscape} />);

			fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });

			expect(onEscape).toHaveBeenCalledOnce();
		});
	});

	/**
	 * @regression search-input-media-query-rem
	 *
	 * La fermeture du clavier mobile doit interroger `matchMedia` en **rem**, jamais
	 * en px : Tailwind exprime ses breakpoints en rem, et un seuil px ne coïncide
	 * avec eux que tant que la police racine vaut 16px. Le commentaire du composant
	 * présentait déjà ce bug comme corrigé (audit responsive 2026-07-26) alors qu'il
	 * n'était verrouillé nulle part.
	 */
	describe("fermeture du clavier mobile", () => {
		const originalMatchMedia = window.matchMedia;

		afterEach(() => {
			window.matchMedia = originalMatchMedia;
		});

		function stubMatchMedia(matches: boolean) {
			// Stub partiel : seul `.matches` est lu sur ce chemin.
			const spy = vi.fn().mockReturnValue({ matches } as MediaQueryList);
			window.matchMedia = spy;
			return spy;
		}

		it("interroge une media query en rem, jamais en px", () => {
			const spy = stubMatchMedia(false);
			render(<SearchInput paramName="q" />);

			fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bague" } });

			expect(spy).toHaveBeenCalledWith("(width < 48rem)");
			for (const [query] of spy.mock.calls) {
				expect(String(query)).not.toMatch(/\dpx/);
			}
		});

		it("ne blur pas le champ quand preventMobileBlur est posé", () => {
			stubMatchMedia(true);
			render(<SearchInput paramName="q" preventMobileBlur />);

			const input = screen.getByRole("searchbox") as HTMLInputElement;
			input.focus();
			fireEvent.change(input, { target: { value: "bague" } });

			expect(document.activeElement).toBe(screen.getByRole("searchbox"));
		});
	});

	/**
	 * `setValue` est le contrat dont dépend `use-quick-search.ts` pour refléter dans
	 * le champ un clic sur « Vouliez-vous dire … ».
	 */
	it("expose setValue via la ref, en notifiant onValueChange", () => {
		const onValueChange = vi.fn();
		const ref = createRef<SearchInputHandle>();
		render(<SearchInput paramName="q" ref={ref} onValueChange={onValueChange} />);

		act(() => ref.current?.setValue("bagues"));

		expect(screen.getByRole("searchbox")).toHaveValue("bagues");
		expect(onValueChange).toHaveBeenCalledWith("bagues");
	});
});
