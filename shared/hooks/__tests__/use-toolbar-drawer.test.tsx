/**
 * @regression toolbar-drawer-shared-state
 *
 * `useToolbarDrawer` tenait son état dans un `useState` LOCAL. Les deux moitiés
 * de la barre d'outils admin étant montées dans des sous-arbres différents (la
 * barre basse rend le tiroir, le badge « Trié par : X » est ailleurs dans la
 * page), chaque appel avait sa propre copie : `open("sort")` depuis le badge
 * écrivait dans un state que personne ne lisait, donc taper le badge ne faisait
 * rien sur TOUTES les listes admin mobiles. Le test « deux consommateurs »
 * ci-dessous est celui qui verrouille la correction — les autres décrivent le
 * contrat d'exclusion mutuelle, déjà vrai avant.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, render, screen, act, cleanup } from "@testing-library/react";

const mockPathname = vi.fn(() => "/admin/catalogue/produits");
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}));

import {
	OverlayStoreProvider,
	SheetAutoCloseOnNavigation,
} from "@/shared/providers/overlay-store-provider";
import { useToolbarDrawer } from "../use-toolbar-drawer";

type DrawerName = "sort" | "filter" | "search";

/**
 * ⚠️ `SheetAutoCloseOnNavigation` est monté EXPLICITEMENT dans le wrapper.
 *
 * Il vivait dans `SheetStoreProvider` jusqu'au 2026-08-07 ; depuis la fusion des
 * trois providers d'overlay, il est un frère monté par `app/layout.tsx` — un
 * provider ne doit pas traîner l'effet de bord (`usePathname()`) d'un seul de ses
 * trois stores. La fermeture au changement de route reste un invariant de ce
 * hook : c'est elle qui justifie que l'état des tiroirs vive dans le store
 * partagé plutôt que dans un `useState` local, cf. sa JSDoc.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
	<OverlayStoreProvider>
		<SheetAutoCloseOnNavigation />
		{children}
	</OverlayStoreProvider>
);

function renderDrawer() {
	return renderHook(() => useToolbarDrawer<DrawerName>(), { wrapper });
}

describe("useToolbarDrawer", () => {
	afterEach(() => {
		cleanup();
		mockPathname.mockReturnValue("/admin/catalogue/produits");
	});

	it("starts with no drawer open", () => {
		const { result } = renderDrawer();

		expect(result.current.openDrawer).toBeNull();
		expect(result.current.isOpen("sort")).toBe(false);
		expect(result.current.isOpen("filter")).toBe(false);
	});

	it("opens a drawer", () => {
		const { result } = renderDrawer();

		act(() => result.current.open("filter"));

		expect(result.current.openDrawer).toBe("filter");
		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("closes the open drawer", () => {
		const { result } = renderDrawer();

		act(() => result.current.open("sort"));
		act(() => result.current.close());

		expect(result.current.openDrawer).toBeNull();
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("ensures mutual exclusion - opening B closes A", () => {
		const { result } = renderDrawer();

		act(() => result.current.open("sort"));
		expect(result.current.isOpen("sort")).toBe(true);

		act(() => result.current.open("filter"));
		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});

	it("onOpenChange returns a handler that toggles the drawer", () => {
		const { result } = renderDrawer();

		const handler = result.current.onOpenChange("search");

		// Open via handler
		act(() => handler(true));
		expect(result.current.isOpen("search")).toBe(true);

		// Close via handler
		act(() => handler(false));
		expect(result.current.isOpen("search")).toBe(false);
	});

	it("onOpenChange(name)(true) replaces any currently open drawer", () => {
		const { result } = renderDrawer();

		act(() => result.current.open("sort"));

		const handler = result.current.onOpenChange("filter");
		act(() => handler(true));

		expect(result.current.isOpen("filter")).toBe(true);
		expect(result.current.isOpen("sort")).toBe(false);
	});

	// -------------------------------------------------------------------------
	// LA régression : le badge et la barre basse sont deux sous-arbres distincts
	// -------------------------------------------------------------------------

	it("un consommateur ouvre le tiroir rendu par un AUTRE consommateur", () => {
		// `SortBadge` (ailleurs dans la page) ne connaît que `open`.
		function SortBadge() {
			const { open } = useToolbarDrawer<DrawerName>();
			return (
				<button type="button" data-testid="badge" onClick={() => open("sort")}>
					Trié par : Récent
				</button>
			);
		}

		// `BottomBar` possède le tiroir.
		function BottomBar() {
			const { isOpen } = useToolbarDrawer<DrawerName>();
			return <span data-testid="drawer">{isOpen("sort") ? "open" : "closed"}</span>;
		}

		render(
			<OverlayStoreProvider>
				<SortBadge />
				<BottomBar />
			</OverlayStoreProvider>,
		);

		expect(screen.getByTestId("drawer")).toHaveTextContent("closed");

		act(() => screen.getByTestId("badge").click());

		expect(screen.getByTestId("drawer")).toHaveTextContent("open");
	});

	it("se referme au changement de route", () => {
		const { result, rerender } = renderDrawer();

		act(() => result.current.open("sort"));
		expect(result.current.isOpen("sort")).toBe(true);

		mockPathname.mockReturnValue("/admin/ventes/commandes");
		rerender();

		expect(result.current.openDrawer).toBeNull();
	});
});
