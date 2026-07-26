import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

/**
 * @regression search-input-url-sync-clobber
 *
 * `router.replace` part dans un `startTransition` : son atterrissage est différé.
 * Une URL PÉRIMÉE arrivait donc après que l'utilisateur eut continué à taper :
 *
 *   1. l'utilisateur tape « abc » → debounce → `replace("?search=abc")` différé
 *   2. l'utilisateur tape « d » → le champ vaut « abcd »
 *   3. la transition atterrit avec « abc » → l'effet de sync réécrivait le champ
 *
 * … et le « d » disparaissait.
 *
 * ⚠️ Revendiquer la valeur dans `handleSearch` (`lastSyncedUrl.current = trimmed`)
 * NE SUFFIT PAS : l'écho périmé « abc » diffère aussi de la dernière
 * revendication « abcd », donc il passe encore pour un changement externe. Le
 * discriminant fiable est le **focus** — on tape champ focus, on navigue (retour,
 * badge de filtre) champ non focus.
 *
 * Le second test est indispensable : sans lui, le correctif pourrait être
 * « obtenu » en supprimant purement et simplement l'effet de sync, ce qui
 * casserait le bouton retour du navigateur.
 */

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
	mockReplace: vi.fn(),
	mockSearchParams: {
		get: vi.fn().mockReturnValue(null),
		toString: vi.fn().mockReturnValue(""),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	const passthrough = fRef(
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
		) => require("react").createElement("span", { ...props, ref } as any, children),
	);
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		MotionConfig: ({ children }: { children: unknown }) => children,
		m: { span: passthrough, div: passthrough },
		useReducedMotion: () => false,
	};
});

vi.mock("@/shared/components/loaders/mini-dots-loader", () => ({
	MiniDotsLoader: () => null,
}));

/**
 * Mock `useAppForm` reproduisant deux propriétés indispensables du vrai :
 *
 * 1. `onChangeAsync` est invoqué SYNCHRONEMENT → le debounce est écrasé, le test
 *    est déterministe.
 * 2. **`AppField` a une identité STABLE entre les rendus.** Le vrai `form.AppField`
 *    l'a ; un mock qui recrée la fonction à chaque rendu fait remonter le
 *    sous-arbre par React, donc le `<input>` est remplacé par un nœud NEUF —
 *    lequel n'a jamais le focus. Un test de la garde de focus deviendrait alors
 *    ininterprétable (et un test capturant le nœud passerait au vert en assertant
 *    un nœud détaché). La valeur vit dans un ref + `forceRender` pour garder
 *    cette identité stable tout en restant à jour.
 */
vi.mock("@/shared/components/forms", () => {
	const React = require("react");

	function useAppForm({ defaultValues }: { defaultValues: { search: string } }) {
		const valueRef = React.useRef(defaultValues.search);
		const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

		const setValue = (v: string) => {
			valueRef.current = v;
			forceRender();
		};

		const [AppField] = React.useState(
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
							void validators?.onChangeAsync?.({ value: v });
						},
					}) as unknown;
				},
		);

		const [Subscribe] = React.useState(
			() =>
				function Subscribe({
					selector,
					children,
				}: {
					selector: (s: { values: { search: string } }) => string;
					children: (v: string) => unknown;
				}) {
					return children(selector({ values: { search: valueRef.current } })) as unknown;
				},
		);

		return {
			AppField,
			Subscribe,
			setFieldValue: (_name: string, v: string) => setValue(v),
			getFieldValue: () => valueRef.current,
		};
	}

	return { useAppForm };
});

const { SearchInput } = await import("../search-input");

// ============================================================================
// TESTS
// ============================================================================

describe("SearchInput — synchronisation URL → champ", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.get.mockReturnValue(null);
		mockSearchParams.toString.mockReturnValue("");
	});

	afterEach(cleanup);

	it("ne perd pas la frappe en vol quand une URL périmée atterrit", () => {
		const { rerender } = render(<SearchInput paramName="search" />);
		// On re-requête l'input à chaque étape plutôt que de capturer une référence :
		// une version antérieure de ce test gardait le nœud, et le mock d'alors
		// recréait `AppField` à chaque rendu — React remontait donc le sous-arbre et
		// le test assertait un nœud DÉTACHÉ, vert pour la mauvaise raison. Le mock est
		// désormais stable (cf. son docblock), mais re-requêter reste la bonne
		// habitude et rend le test robuste à un futur changement de mock.
		const getInput = () => screen.getByRole("searchbox") as HTMLInputElement;

		// L'utilisateur est en train de taper : le champ a le focus.
		getInput().focus();

		// 1. Frappe « abc » → écrit l'URL (transition différée).
		fireEvent.change(getInput(), { target: { value: "abc" } });
		expect(mockReplace).toHaveBeenCalledWith("?search=abc", { scroll: false });

		// 2. L'utilisateur enchaîne sur « abcd » AVANT que la transition n'atterrisse.
		getInput().focus();
		fireEvent.change(getInput(), { target: { value: "abcd" } });
		expect(getInput()).toHaveValue("abcd");

		// 3. La transition différée atterrit avec la valeur PÉRIMÉE « abc ».
		getInput().focus();
		mockSearchParams.get.mockReturnValue("abc");
		rerender(<SearchInput paramName="search" />);

		// Avant correctif : le champ retombait à « abc » et le « d » était perdu.
		expect(getInput()).toHaveValue("abcd");
	});

	it("applique un changement d'URL externe quand le champ n'a pas le focus", () => {
		const { rerender } = render(<SearchInput paramName="search" />);
		const getInput = () => screen.getByRole("searchbox") as HTMLInputElement;

		getInput().focus();
		fireEvent.change(getInput(), { target: { value: "abc" } });

		// Navigation externe (bouton retour, badge de filtre) : le champ n'a plus le
		// focus. Sans cette assertion, le correctif pourrait être « obtenu » en
		// supprimant l'effet de sync — ce qui casserait le bouton retour.
		getInput().blur();
		mockSearchParams.get.mockReturnValue("externe");
		rerender(<SearchInput paramName="search" />);

		expect(getInput()).toHaveValue("externe");
	});
});
