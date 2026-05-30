/**
 * @regression bulk-selection-toolbar-bridge-single-slot
 *
 * Sur une page admin, la liste mobile (`md:hidden`) ET la table desktop
 * (`hidden md:block` via `AdminDataTable`) montent toutes deux un
 * `BulkSelectionProvider`. Le bridge `useAdminListSelectionStore` ne retient
 * qu'UN control. Avant le fix, les deux providers appelaient `register()` et le
 * provider desktop (rendu après dans le JSX → effet exécuté en dernier) volait
 * le control. Le toggle « Sélectionner » de la `StickyActionBar` mobile pilotait
 * alors une liste invisible → « rien ne se passe, le mode sélection ne s'active
 * pas » sur mobile.
 *
 * Garde : seul le provider bridgeant (`bridgeToToolbar` défaut `true`) publie son
 * control ; un provider opté-out (`bridgeToToolbar={false}`, ce que passe
 * `AdminDataTable`) ne l'écrase jamais, même monté après.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "../bulk-selection-context";
import { useAdminListSelectionStore } from "@/shared/stores/use-admin-list-selection-store";

function ModeProbe({ name }: { name: string }) {
	const { selectionMode } = useBulkSelectionContext();
	return <span data-testid={`mode-${name}`}>{selectionMode ? "on" : "off"}</span>;
}

afterEach(() => {
	cleanup();
	act(() => {
		useAdminListSelectionStore.getState().unregister();
	});
});

beforeEach(() => {
	act(() => {
		useAdminListSelectionStore.getState().unregister();
	});
});

describe("BulkSelectionProvider — bridge slot unique (régression mobile)", () => {
	it("le provider opté-out (desktop) n'enregistre jamais de control", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]} bridgeToToolbar={false}>
				<ModeProbe name="desktop" />
			</BulkSelectionProvider>,
		);

		expect(useAdminListSelectionStore.getState().control).toBeNull();
	});

	it("avec mobile (bridge) + desktop (opt-out) montés, le control reste celui du mobile", () => {
		// Ordre JSX = celui de la page : liste mobile d'abord, table desktop ensuite
		// (c'est l'ordre qui faisait gagner le desktop avant le fix).
		render(
			<>
				<BulkSelectionProvider pageItemIds={["a"]}>
					<ModeProbe name="mobile" />
				</BulkSelectionProvider>
				<BulkSelectionProvider pageItemIds={["a"]} bridgeToToolbar={false}>
					<ModeProbe name="desktop" />
				</BulkSelectionProvider>
			</>,
		);

		const control = useAdminListSelectionStore.getState().control;
		expect(control).not.toBeNull();

		// Le toggle de la StickyActionBar appelle control.enter() : doit activer le
		// mode du provider MOBILE (visible), pas du desktop (invisible).
		act(() => {
			control!.enter();
		});

		expect(screen.getByTestId("mode-mobile")).toHaveTextContent("on");
		expect(screen.getByTestId("mode-desktop")).toHaveTextContent("off");
	});

	it("expose un control bridgeable par défaut (sans prop)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<ModeProbe name="mobile" />
			</BulkSelectionProvider>,
		);

		expect(useAdminListSelectionStore.getState().control).not.toBeNull();
		expect(useAdminListSelectionStore.getState().control?.pageHasItems).toBe(true);
	});
});
