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
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (fn: () => void) => fn(),
}));

import { OVERLAY_SELECTOR, useAdminFormKeyboard } from "../use-admin-form-keyboard";

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
		expect(mockPush).toHaveBeenCalledWith("/admin/liste");
	});

	it("disables the Escape shortcut entirely when no listPath is given", () => {
		const { getByTestId } = render(<Harness />);

		fireEvent.keyDown(getByTestId("plain-field"), { key: "Escape", bubbles: true });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});
});
