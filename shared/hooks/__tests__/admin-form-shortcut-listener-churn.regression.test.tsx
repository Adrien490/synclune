/**
 * @regression admin-form-shortcut-listener-churn — les raccourcis clavier admin
 * n'attachent leurs listeners `window` qu'une seule fois.
 *
 * Bug corrigé (passe React 19.2, 2026-08-07) : `isPending` et `extraBusy`
 * figuraient dans les dépendances des deux effets alors qu'ils ne sont lus qu'en
 * GARDE à l'intérieur des handlers. Chaque soumission de formulaire et chaque
 * bascule d'upload média détachait donc puis rattachait les deux listeners
 * `keydown` — sur les ~19 formulaires admin qui consomment ce hook. Le hook
 * compensait en parallèle avec un `liveRef` écrit à chaque rendu, réimplémentant
 * à la main ce que `useEffectEvent` fait mieux (et plus tôt dans le commit).
 *
 * Les deux effets ne dépendent plus que de ce qui conditionne réellement
 * l'EXISTENCE du listener : `isMobile`, et `listPath` pour Échap.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHaptic, mockRouter } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	mockRouter: { push: vi.fn() },
}));

vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => mockHaptic }));
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

import { useAdminFormKeyboard } from "../use-admin-form-keyboard";

/**
 * Toutes les callbacks sont déclarées INLINE : c'est le cas réel des formulaires
 * admin, et celui qui expose une dépendance instable.
 */
function Harness({
	isPending = false,
	extraBusy = false,
	tick = 0,
}: {
	isPending?: boolean;
	extraBusy?: boolean;
	tick?: number;
}) {
	const formRef = useRef<HTMLFormElement>(null);
	useAdminFormKeyboard({
		formRef,
		isPending,
		extraBusy,
		isMobile: false,
		listPath: "/admin/catalogue/couleurs",
		allowNavigation: () => void tick,
		getIsDirty: () => tick > 0,
		getCanSubmit: () => tick >= 0,
	});
	return <form ref={formRef} aria-label="harness" />;
}

/** Indirection pour laisser TypeScript INFÉRER le type du spy (`addEventListener`
 * est surchargé : l'annoter à la main ne satisfait pas la contrainte de `vi.spyOn`). */
const spyOnWindowAdd = () => vi.spyOn(window, "addEventListener");
let addSpy: ReturnType<typeof spyOnWindowAdd>;

/** Nombre de listeners `keydown` attachés à `window` depuis le montage. */
function keydownAttachCount(): number {
	return addSpy.mock.calls.filter((call: unknown[]) => call[0] === "keydown").length;
}

beforeEach(() => {
	addSpy = spyOnWindowAdd();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe("@regression admin-form-shortcut-listener-churn", () => {
	it("n'attache que 2 listeners keydown, quels que soient les rendus suivants", () => {
		const { rerender } = render(<Harness />);
		expect(keydownAttachCount()).toBe(2); // ⌘S + Échap

		// Une soumission : `isPending` bascule dans les deux sens.
		rerender(<Harness isPending />);
		rerender(<Harness />);
		// Un téléversement média : `extraBusy` bascule.
		rerender(<Harness extraBusy />);
		rerender(<Harness />);
		// Et de simples rendus qui renouvellent l'identité des callbacks inline.
		rerender(<Harness tick={1} />);
		rerender(<Harness tick={2} />);

		expect(keydownAttachCount()).toBe(2);
	});

	it("lit quand même la valeur COURANTE de isPending sans se ré-attacher", () => {
		const submit = vi.fn();
		HTMLFormElement.prototype.requestSubmit = submit;

		const { rerender } = render(<Harness />);
		fireEvent.keyDown(document.body, { key: "s", metaKey: true });
		expect(submit).toHaveBeenCalledTimes(1);

		// Soumission en cours : la garde doit mordre, sans rattachement.
		rerender(<Harness isPending />);
		fireEvent.keyDown(document.body, { key: "s", metaKey: true });
		expect(submit).toHaveBeenCalledTimes(1);

		// Retour au repos : le raccourci redevient actif.
		rerender(<Harness />);
		fireEvent.keyDown(document.body, { key: "s", metaKey: true });
		expect(submit).toHaveBeenCalledTimes(2);

		expect(keydownAttachCount()).toBe(2);
	});

	it("lit quand même la valeur COURANTE de extraBusy sans se ré-attacher", () => {
		const submit = vi.fn();
		HTMLFormElement.prototype.requestSubmit = submit;

		const { rerender } = render(<Harness />);
		rerender(<Harness extraBusy />);
		fireEvent.keyDown(document.body, { key: "s", metaKey: true });
		expect(submit).not.toHaveBeenCalled();

		rerender(<Harness />);
		fireEvent.keyDown(document.body, { key: "s", metaKey: true });
		expect(submit).toHaveBeenCalledTimes(1);

		expect(keydownAttachCount()).toBe(2);
	});
});
