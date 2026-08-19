/**
 * @regression admin-form-escape-overlay — Échap qui ferme un overlay ne quitte
 * jamais le formulaire.
 *
 * Bug corrigé (audit formulaires 2026-07-26) : le sélecteur « ignorer si un
 * overlay est ouvert » ne listait que dialog / sheet / popover. Un `Select` Radix
 * (`data-slot="select-content"`) ou un menu déroulant n'en faisaient pas partie :
 * fermer le Select « Type de remise » avec Échap déclenchait donc AUSSI le
 * `window.confirm` des modifications non enregistrées puis la navigation vers la
 * liste. Huit formulaires admin recopiaient ce sélecteur incomplet inline ; ils
 * passent désormais tous par ce hook, seul porteur de `OVERLAY_SELECTOR`.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPush, mockHaptic } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => mockHaptic }));

import { OVERLAY_SELECTOR, useAdminFormKeyboard } from "../use-admin-form-keyboard";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

// Pas de valeur par défaut ici : un `listPath={undefined}` explicite doit bien
// arriver `undefined` jusqu'au hook (c'est le cas testé).
function Harness({ listPath }: { listPath?: string }) {
	const formRef = { current: null } as React.RefObject<HTMLFormElement | null>;

	useAdminFormKeyboard({
		formRef,
		isPending: false,
		isMobile: false,
		listPath,
		allowNavigation: () => undefined,
		getIsDirty: () => true, // dirty : sans garde, Échap déclenche le confirm
	});

	return (
		<div>
			<div data-slot="select-content">
				<div data-testid="select-item" tabIndex={-1} />
			</div>
			<div data-slot="dropdown-menu-content">
				<div data-testid="menu-item" tabIndex={-1} />
			</div>
			<input data-testid="plain-field" />
		</div>
	);
}

/**
 * Confirmation Radix ouverte au-dessus du formulaire. `role="alertdialog"` et
 * `data-state="open"` reproduisent fidèlement ce que rend `AlertDialogContent` —
 * le rôle est le point du test (voir le bloc « confirmation » plus bas).
 */
function HarnessWithConfirm({ focusOnBody = false }: { focusOnBody?: boolean }) {
	const formRef = { current: null } as React.RefObject<HTMLFormElement | null>;

	useAdminFormKeyboard({
		formRef,
		isPending: false,
		isMobile: false,
		listPath: "/admin/liste",
		allowNavigation: () => undefined,
		getIsDirty: () => true,
	});

	return (
		<div>
			<div data-slot="alert-dialog-content" role="alertdialog" data-state="open">
				{!focusOnBody && <button data-testid="confirm-cancel" type="button" />}
			</div>
			<input data-testid="plain-field" />
		</div>
	);
}

describe("@regression admin-form-escape-overlay", () => {
	let confirmSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
	});

	afterEach(() => {
		// Le setup global ne fait que `restoreAllMocks` : sans cleanup, les harnais
		// s'accumulent dans le DOM (et leurs listeners avec).
		cleanup();
		confirmSpy.mockRestore();
		mockPush.mockClear();
	});

	it("lists select and dropdown contents among the ignored overlays", () => {
		expect(OVERLAY_SELECTOR).toContain("[data-slot='select-content']");
		expect(OVERLAY_SELECTOR).toContain("[data-slot='dropdown-menu-content']");
	});

	it("does not navigate when Escape closes an open Select", () => {
		const { getByTestId } = render(<Harness listPath="/admin/liste" />);

		fireEvent.keyDown(getByTestId("select-item"), { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("does not navigate when Escape closes an open dropdown menu", () => {
		const { getByTestId } = render(<Harness listPath="/admin/liste" />);

		fireEvent.keyDown(getByTestId("menu-item"), { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("still navigates on Escape from a plain field (after confirming)", () => {
		const { getByTestId } = render(<Harness listPath="/admin/liste" />);

		fireEvent.keyDown(getByTestId("plain-field"), { key: "Escape", bubbles: true });

		expect(confirmSpy).toHaveBeenCalledOnce();
		expect(mockPush).toHaveBeenCalledWith("/admin/liste", PAGE_FADE_NAVIGATION);
	});

	// -------------------------------------------------------------------------
	// Confirmations Radix — audit « Overlays » 2026-07-26 (P1-3).
	//
	// `AlertDialogContent` rend `role="alertdialog"`, PAS `role="dialog"` : le
	// sélecteur ne l'attrapait donc pas. Échap sur une confirmation ouverte
	// au-dessus d'un formulaire admin fermait la confirmation ET quittait la
	// page. Cas le plus atteignable des 23 formulaires concernés : formulaire
	// dirty → Échap → `UnsavedChangesDialog` (un AlertDialog) → Échap → Radix
	// ferme pendant que ce raccourci redemande la navigation, qui le rouvre.
	// -------------------------------------------------------------------------

	it("lists alertdialog among the ignored overlays", () => {
		expect(OVERLAY_SELECTOR).toContain("[role='alertdialog']");
		expect(OVERLAY_SELECTOR).toContain("[data-slot='alert-dialog-content']");
	});

	it("does not navigate when Escape closes an open confirmation", () => {
		const { getByTestId } = render(<HarnessWithConfirm />);

		fireEvent.keyDown(getByTestId("confirm-cancel"), { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	// Le test portait sur `event.target` seul : overlay ouvert mais focus resté
	// sur `<body>` (confirmation sans élément focusable, focus perdu après une
	// action), `closest()` renvoyait null et le raccourci se déclenchait
	// par-dessus l'overlay. D'où le repli sur une requête DOM.
	it("does not navigate when an overlay is open but focus sits on body", () => {
		render(<HarnessWithConfirm focusOnBody />);

		fireEvent.keyDown(document.body, { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("disables the Escape shortcut entirely when no listPath is given", () => {
		const { getByTestId } = render(<Harness />);

		fireEvent.keyDown(getByTestId("plain-field"), { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});
});
