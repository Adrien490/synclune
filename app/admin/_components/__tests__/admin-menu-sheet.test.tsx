import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsOpen,
	mockOpenMenu,
	mockCloseMenu,
	mockUsePathname,
	mockRouterPush,
	mockTriggerHaptic,
	mockSheetContentProps,
	mockSheetOnOpenChange,
} = vi.hoisted(() => ({
	mockIsOpen: { current: false },
	mockOpenMenu: vi.fn(),
	mockCloseMenu: vi.fn(),
	mockUsePathname: vi.fn(() => "/admin"),
	mockRouterPush: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	// Capture handler props passed to SheetContent so tests can invoke them with a
	// synthetic event (otherwise unreachable without a real Vaul portal).
	mockSheetContentProps: { current: null as null | { initialFocus?: unknown } },
	// `SheetClose` doit passer par la primitive : c'est elle qui reprend l'entrée
	// d'historique posée par `useBackButtonClose`. Le mock capture donc le
	// `onOpenChange` du Root pour que le bouton Fermer l'appelle vraiment.
	mockSheetOnOpenChange: { current: null as null | ((open: boolean) => void) },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => {
	const actual = await importOriginal<typeof PhosphorIcons>();
	return {
		...actual,
		ArrowSquareOutIcon: (props: Record<string, unknown>) => (
			<svg data-testid="icon-external-link" {...props} />
		),
		SignOutIcon: (props: Record<string, unknown>) => <svg data-testid="icon-logout" {...props} />,
		MagnifyingGlassMinusIcon: (props: Record<string, unknown>) => (
			<svg data-testid="icon-search-x" {...props} />
		),
		XIcon: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
	};
});

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		prefetch,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		prefetch?: boolean | null;
		[key: string]: unknown;
	}) => (
		<a href={href} data-prefetch={prefetch === undefined ? undefined : String(prefetch)} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.current,
		open: mockOpenMenu,
		close: mockCloseMenu,
	}),
}));

// PAS de mock d'`isRouteActive` : fonction pure sans dépendance, et son mock
// historique DIVERGEAIT de l'implémentation (il ignorait la règle « `/admin`
// n'est actif qu'en correspondance exacte »). Sur cette surface, cette règle
// décide quel groupe s'ouvre d'office : la mocker rendait le test aveugle.

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string")
			.join(" "),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({
		children,
		open,
		onOpenChange,
		scrollLockTimeout,
	}: {
		children: React.ReactNode;
		open: boolean;
		direction?: string;
		onOpenChange?: (v: boolean) => void;
		preventScrollRestoration?: boolean;
		scrollLockTimeout?: number;
	}) => {
		mockSheetOnOpenChange.current = onOpenChange ?? null;
		return open ? (
			<div data-testid="sheet" data-scroll-lock-timeout={scrollLockTimeout ?? ""}>
				<button type="button" data-testid="sheet-dismiss" onClick={() => onOpenChange?.(false)}>
					dismiss
				</button>
				{children}
			</div>
		) : null;
	},
	SheetContent: ({
		children,
		className,
		id,
		onOverlayClick,
		initialFocus,
	}: {
		children: React.ReactNode;
		className?: string;
		id?: string;
		onOverlayClick?: (e: React.MouseEvent) => void;
		initialFocus?: unknown;
	}) => {
		mockSheetContentProps.current = { initialFocus };
		return (
			<div data-testid="sheet-content" data-slot="sheet-content" id={id} className={className}>
				<div data-testid="sheet-overlay" onClick={(e) => onOverlayClick?.(e)} aria-hidden="true" />
				{children}
			</div>
		);
	},
	SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-header" className={className}>
			{children}
		</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetHandle: ({ className }: { className?: string }) => (
		<div data-testid="sheet-handle" className={className} />
	),
	// `render` déplace l'ÉLÉMENT, pas les enfants : le mock reprend donc les props
	// du bouton passé en `render` et lui greffe les children de `SheetClose`.
	SheetClose: ({
		render,
		children,
	}: {
		render?: React.ReactElement<Record<string, unknown>>;
		children?: React.ReactNode;
	}) => (
		<button
			type="button"
			{...(render?.props ?? {})}
			onClick={() => mockSheetOnOpenChange.current?.(false)}
		>
			{children}
		</button>
	),
}));

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({
		open,
		onOpenChange,
	}: {
		open: boolean;
		onOpenChange: (v: boolean) => void;
	}) =>
		open ? (
			<div data-testid="logout-dialog">
				<button onClick={() => onOpenChange(false)}>Cancel</button>
			</div>
		) : null,
}));

import { AdminMenuSheet } from "../admin-menu-sheet";
import type * as PhosphorIcons from "@phosphor-icons/react/ssr";

// ============================================================================
// SETUP
// ============================================================================

const defaultUser = { name: "Admin User", email: "admin@synclune.fr" };

beforeEach(() => {
	vi.clearAllMocks();
	// `clearAllMocks` n'efface PAS les implémentations : sans ce reset, un
	// `mockReturnValue` posé dans un test fuit dans tous les suivants. Depuis que
	// le vrai `isRouteActive` est utilisé, la route décide quel groupe est déplié
	// — une fuite rendait donc des tests verts ou rouges selon leur ordre.
	mockUsePathname.mockReturnValue("/admin");
	mockIsOpen.current = false;
	mockSheetContentProps.current = null;
	mockSheetOnOpenChange.current = null;
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMenuSheet", () => {
	describe("when closed", () => {
		it("does not render sheet content", () => {
			mockIsOpen.current = false;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
		});
	});

	describe("when open", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
		});

		it("renders the sheet", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByTestId("sheet")).toBeInTheDocument();
		});

		// La carte utilisateur en tête de panneau a disparu : elle occupait la zone
		// la moins atteignable sans porter aucune action. L'identité du compte vit
		// désormais là où elle sert — au moment de fermer la session.
		it("n'affiche plus de carte utilisateur en tête de panneau", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
		});

		it("expose l'email du compte DANS le bouton de déconnexion", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const logoutBtn = screen.getByText("Déconnexion").closest("button");
			expect(logoutBtn).toHaveTextContent("admin@synclune.fr");
		});

		it("renders search input", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByLabelText("Filtrer les pages de navigation")).toBeInTheDocument();
		});

		it("renders dashboard link", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
		});

		// `Configuration` et `Contenu` ont fusionné en `Boutique`, `Clients` a rejoint
		// Trois groupes, aucun mono-item (cf. navigation-config). `Ventes` a fusionné
		// dans `Pilotage` au retrait de l'espace client (2026-07-31) : la disparition de
		// `/admin/clients` laissait `Pilotage` avec le seul « Tableau de bord ».
		it("renders navigation groups", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Pilotage")).toBeInTheDocument();
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
			expect(screen.getByText("Boutique")).toBeInTheDocument();
			expect(screen.queryByText("Ventes")).toBeNull();
		});

		it('sets aria-label="Navigation administration" on nav', () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const nav = screen.getByLabelText("Navigation administration");
			expect(nav).toBeInTheDocument();
		});

		// Les groupes sont REPLIÉS par défaut, sauf celui de la route courante.
		// Sur `/admin`, seul `Pilotage` est ouvert : ses items sont dans le DOM,
		// ceux de `Catalogue` ne le sont pas (Base UI démonte le panneau fermé).
		it("ne rend que les items du groupe de la route courante", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Commandes")).toBeInTheDocument();
			expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
			expect(screen.queryByText("Produits")).not.toBeInTheDocument();
		});

		it("déplie un groupe au clic sur son déclencheur", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const trigger = screen.getByRole("button", { name: /Catalogue/i });
			expect(trigger).toHaveAttribute("aria-expanded", "false");

			fireEvent.click(trigger);

			expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(screen.getByText("Produits")).toBeInTheDocument();
		});

		it("marks active route with aria-current", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<AdminMenuSheet user={defaultUser} />);
			// `/^Produits$/` et non `/Produits/i` : « Types de produits » matcherait aussi.
			const activeLink = screen.getByRole("link", { name: /^Produits$/ });
			expect(activeLink).toHaveAttribute("aria-current", "page");
		});

		// Le groupe de la route courante s'ouvre seul — même règle que la sidebar
		// desktop (`collapsible-nav-group.tsx`). Sans ça, arriver sur une page du
		// catalogue laissait son groupe fermé.
		it("ouvre d'office le groupe qui contient la route courante", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByRole("button", { name: /Catalogue/i })).toHaveAttribute(
				"aria-expanded",
				"true",
			);
			expect(screen.getByRole("button", { name: /Pilotage/i })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});

		it("renders external link to site", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Voir le site/ });
			expect(link).toHaveAttribute("href", "/");
			expect(link).toHaveAttribute("target", "_blank");
		});

		it("announces the new-tab behaviour to screen readers (WCAG 2.5.3)", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			// Visible label stays "Voir le site"; the sr-only suffix makes the
			// accessible name "Voir le site (ouvre dans un nouvel onglet)".
			const link = screen.getByRole("link", {
				name: /Voir le site.*ouvre dans un nouvel onglet/,
			});
			expect(link).toBeInTheDocument();
		});
	});

	describe("badges", () => {
		// Badges are keyed by item.id. In shop-closed mode "orders" is hidden, so
		// these tests use "products" (always visible) to exercise the rendering logic.
		// `products` n'est PAS une file actionnable : il ne remonte pas dans
		// l'ardoise, donc « 5 » n'apparaît qu'une fois, sur la rangée. On se place
		// sur la route du catalogue pour que le groupe soit déplié.
		beforeEach(() => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
		});

		// Ciblé par le nom accessible du badge, pas par son texte : les déclencheurs
		// de groupe affichent eux aussi un nombre (le compte de pages du groupe).
		it("displays badge count on items", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 5 }} />);
			expect(screen.getByLabelText("5 en attente")).toHaveTextContent("5");
		});

		it("caps badge at 99+", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 150 }} />);
			expect(screen.getByLabelText("150 en attente")).toHaveTextContent("99+");
		});

		it("does not show badge when count is 0", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 0 }} />);
			expect(screen.queryByText("0")).not.toBeInTheDocument();
		});
	});

	describe("logout flow", () => {
		it("shows logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Déconnexion")).toBeInTheDocument();
		});

		it("closes menu on logout click", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockCloseMenu).toHaveBeenCalled();
		});

		it('triggers "medium" haptic on logout click (destructive action)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});

		it("defers the logout dialog until after the sheet has finished closing", () => {
			mockIsOpen.current = true;
			const { rerender } = render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockCloseMenu).toHaveBeenCalled();
			// Dialog ne s'ouvre PAS immédiatement (tant que la sheet est ouverte)
			expect(screen.queryByTestId("logout-dialog")).not.toBeInTheDocument();

			// Simule la fermeture effective de la sheet par Vaul
			mockIsOpen.current = false;
			rerender(<AdminMenuSheet user={defaultUser} />);
			// Toujours pas visible : le timer fallback n'a pas encore tiré
			expect(screen.queryByTestId("logout-dialog")).not.toBeInTheDocument();

			// Fallback timer (VAUL_EXIT_DURATION_MS = 450)
			vi.advanceTimersByTime(450);
			rerender(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByTestId("logout-dialog")).toBeInTheDocument();
		});
	});

	describe("sheet title", () => {
		it("renders a VISIBLE title (l'en-tête n'est plus sr-only)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Menu")).toBeInTheDocument();
		});
	});

	describe("search differentiation (P1.4)", () => {
		it('uses "Filtrer les pages" placeholder (not generic search)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input).toHaveAttribute("placeholder", "Filtrer les pages…");
		});
	});

	describe("aria-live search results (P1.5)", () => {
		it("announces empty state via aria-live polite", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "xyznope" } });

			const statusNodes = screen.getAllByRole("status");
			const liveMessage = statusNodes.find((n) => n.textContent.includes("Aucun résultat"));
			expect(liveMessage).toBeDefined();
			expect(liveMessage).toHaveAttribute("aria-live", "polite");
		});

		it("labels results region with count", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });

			// `{ name }` obligatoire : l'ardoise est elle aussi une region nommée.
			const region = screen.getByRole("region", { name: /résultats? de navigation/ });
			expect(region).toBeInTheDocument();
		});
	});

	describe("search Enter navigation (Lot C)", () => {
		it("navigates to the first filtered result on Enter", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRouterPush).toHaveBeenCalledWith("/admin/ventes/commandes");
			expect(mockCloseMenu).toHaveBeenCalled();
		});

		it("does nothing on Enter when there are no results", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "xyznope" } });
			fireEvent.keyDown(input, { key: "Enter" });

			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('exposes enterKeyHint="go" only when results exist', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input).toHaveAttribute("enterkeyhint", "done");
			fireEvent.change(input, { target: { value: "command" } });
			expect(input).toHaveAttribute("enterkeyhint", "go");
		});
	});

	describe("scroll fade (P2.4)", () => {
		it("wraps nav in ScrollFade with vertical axis and fadeFromClass=from-muted", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			const scrollFadeRoot = screen.getByTestId("scroll-fade-root");
			expect(scrollFadeRoot).toBeInTheDocument();

			const scrollContainer = screen.getByTestId("scroll-fade-container");
			// ScrollFade vertical axis gives h-full + overflow-y-auto
			expect(scrollContainer.className).toContain("overflow-y-auto");
			// overscroll-contain passed through via className
			expect(scrollContainer.className).toContain("overscroll-contain");
		});

		it("nav is inside scroll-fade container (landmark preserved)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			const nav = screen.getByLabelText("Navigation administration");
			const scrollContainer = screen.getByTestId("scroll-fade-container");
			expect(scrollContainer.contains(nav)).toBe(true);
		});
	});

	describe("haptic feedback (P1.3)", () => {
		it('fires "selection" haptic on dismiss', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByTestId("sheet-dismiss"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic on scrim tap', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByTestId("sheet-overlay"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});
	});

	// `scrollLockTimeout` était un réglage Vaul, sans équivalent Base UI (l'arbitrage
	// scroll vs swipe s'y fait sur la direction du geste). Le prop et son test ont
	// disparu avec la migration ; ce qui reste gardé, c'est `handleOnly` — cf.
	// `handle-only-allowlist.regression.test.ts`.

	describe("sheet content id (P0 — aria-controls target)", () => {
		it("renders SheetContent with the stable id used by the bottom-bar trigger", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const content = screen.getByTestId("sheet-content");
			expect(content).toHaveAttribute("id", "admin-menu-sheet-content");
			expect(content).toHaveAttribute("data-slot", "sheet-content");
		});
	});

	/**
	 * @regression admin-menu-live-region-mounted-empty
	 *
	 * La région d'annonce est montée EN PERMANENCE (hors du portal de la sheet) et
	 * naît VIDE : c'est la seule forme qu'un lecteur d'écran vocalise ensuite. Elle
	 * vivait auparavant DANS la sheet, montée conditionnellement avec son texte
	 * déjà écrit — soit exactement le défaut corrigé sur la bottom bar admin le
	 * 2026-07-30 (`admin-mobile-bottom-bar.tsx`), dont la correction n'avait jamais
	 * été reportée ici.
	 *
	 * ⚠️ Ces tests DOIVENT jouer la transition fermé → ouvert. Rendre directement
	 * avec `isOpen = true` ne prouverait rien : c'est précisément le cas où
	 * l'ancienne implémentation semblait correcte.
	 */
	describe("@regression opening live region (montée vide, texte dérivé au rendu)", () => {
		function openSheet(props: Partial<React.ComponentProps<typeof AdminMenuSheet>> = {}) {
			mockIsOpen.current = false;
			const view = render(<AdminMenuSheet user={defaultUser} {...props} />);
			const region = screen
				.getAllByRole("status")
				.find((n) => n.className.includes("sr-only") && n.textContent === "");
			mockIsOpen.current = true;
			view.rerender(<AdminMenuSheet user={defaultUser} {...props} />);
			return { region, ...view };
		}

		it("est montée et VIDE tant que la sheet est fermée", () => {
			mockIsOpen.current = false;
			render(<AdminMenuSheet user={defaultUser} />);
			const regions = screen.getAllByRole("status");
			expect(regions.length).toBeGreaterThan(0);
			expect(regions.every((n) => n.textContent === "")).toBe(true);
			expect(regions[0]).toHaveAttribute("aria-live", "polite");
		});

		it("annonce « Menu ouvert, N options de navigation » à l'ouverture", () => {
			const { region } = openSheet();
			expect(region?.textContent).toMatch(/Menu ouvert, \d+ options? de navigation/);
		});

		it("surfaces the actionable pending total when badges are present", () => {
			const { region } = openSheet({ badges: { orders: 3, refunds: 2 } });
			expect(region?.textContent).toMatch(/5 éléments à traiter/);
		});

		it("omits the pending total when there is nothing to handle", () => {
			const { region } = openSheet({ badges: { orders: 0 } });
			expect(region?.textContent).not.toMatch(/à traiter/);
		});

		it("se tait pendant la recherche (pour ne pas concurrencer le compte de résultats)", () => {
			const { region } = openSheet();
			expect(region?.textContent).not.toBe("");

			fireEvent.change(screen.getByLabelText("Filtrer les pages de navigation"), {
				target: { value: "command" },
			});
			expect(region?.textContent).toBe("");
		});
	});

	describe("search live region enriched (P1.3)", () => {
		it("uses 'résultats de navigation' qualifier in the count region", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });

			const statusNodes = screen.getAllByRole("status");
			const liveCount = statusNodes.find((n) => /\d+ résultats? de navigation/.test(n.textContent));
			expect(liveCount).toBeDefined();
			expect(liveCount).toHaveAttribute("aria-live", "polite");
		});

		it("wraps the search query in French chevrons in the empty live region", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "zzzz" } });

			const statusNodes = screen.getAllByRole("status");
			const empty = statusNodes.find((n) => /Aucun résultat pour « zzzz »/.test(n.textContent));
			expect(empty).toBeDefined();
		});
	});

	describe("nav item haptic feedback (P1.2)", () => {
		it('fires "selection" haptic when clicking the dashboard link', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByRole("link", { name: /Tableau de bord/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic when clicking a group navigation link', () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByRole("link", { name: /^Produits$/ }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic when clicking "Voir le site"', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByRole("link", { name: /Voir le site/ }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});
	});

	describe("tactile classes (P1.2)", () => {
		it("applies touch-manipulation + motion-safe scale on group nav links", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /^Produits$/ });
			expect(link.className).toContain("touch-manipulation");
			expect(link.className).toContain("motion-safe:active:scale-[0.97]");
		});

		it("applies tactile classes on the dashboard link", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(link.className).toContain("touch-manipulation");
			expect(link.className).toContain("motion-safe:active:scale-[0.97]");
		});

		it("applies tactile classes on the logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const btn = screen.getByText("Déconnexion").closest("button")!;
			expect(btn.className).toContain("touch-manipulation");
			expect(btn.className).toContain("motion-safe:active:scale-[0.97]");
		});

		it("applies tap-highlight neutralizer on NAV_ITEM_TACTILE_CLASS (2026-05-16 G6)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(link.className).toContain("[-webkit-tap-highlight-color:transparent]");
		});
	});

	describe("search clear button (2026-05-16 G3)", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
		});

		it("hides clear button when query is empty", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.queryByLabelText("Effacer la recherche")).not.toBeInTheDocument();
		});

		it("shows clear button once the query is non-empty", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "comm" } });
			expect(screen.getByLabelText("Effacer la recherche")).toBeInTheDocument();
		});

		it("clears the query, fires light haptic and refocuses the input on click", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation") as HTMLInputElement;
			fireEvent.change(input, { target: { value: "comm" } });
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByLabelText("Effacer la recherche"));

			expect(input.value).toBe("");
			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
			expect(document.activeElement).toBe(input);
		});
	});

	describe("empty state visual (2026-05-16 G4)", () => {
		it("renders a SearchX icon when no results match the query", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "zzzzzz" } });

			expect(screen.getByTestId("icon-search-x")).toBeInTheDocument();
		});
	});

	describe("controlled prefetch (2026-05-16 G5)", () => {
		it("passes prefetch={null} on the Dashboard link (no viewport prefetch)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const dashboard = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(dashboard).toHaveAttribute("data-prefetch", "null");
		});

		it("passes prefetch={null} on group navigation links", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const products = screen.getByRole("link", { name: /^Produits$/ });
			expect(products).toHaveAttribute("data-prefetch", "null");
		});

		it('passes prefetch={false} on the "Voir le site" external link', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const external = screen.getByRole("link", { name: /Voir le site/ });
			expect(external).toHaveAttribute("data-prefetch", "false");
		});
	});

	describe("logout destructive feedback (2026-05-16 G7)", () => {
		it("uses active:bg-destructive/10 (not active:bg-accent) on the logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const btn = screen.getByText("Déconnexion").closest("button")!;
			expect(btn.className).toContain("active:bg-destructive/10");
			expect(btn.className).not.toContain("active:bg-accent");
		});
	});

	describe("focus management on open (F1 — parité menu-sheet-nav)", () => {
		it("suspend l'auto-focus d'ouverture (pas de pop clavier iOS)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			// Base UI expose `initialFocus` : `false` = « ne déplace pas le focus ».
			// Remplace l'ancien `onOpenAutoFocus` + `preventDefault` de Radix ; le
			// focus reste appliqué après l'animation par l'effect dédié.
			expect(mockSheetContentProps.current?.initialFocus).toBe(false);
		});

		// Sans file en attente, le premier élément actionnable du nav est le
		// DÉCLENCHEUR du premier groupe — d'où le sélecteur `a, button` : viser `a`
		// seul projetait le focus jusqu'à « Voir le site », tout en bas.
		it("focuses the first actionable element after the open animation (fallback timer)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			// transitionend ne fire pas en JSDOM ; le fallback @ SHEET_EXIT_DURATION_MS applique le focus
			vi.advanceTimersByTime(450);
			expect(document.activeElement).toBe(screen.getByRole("button", { name: /Pilotage/i }));
		});

		it("focuse la première FILE quand il y a du travail en attente", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ orders: 3 }} />);
			vi.advanceTimersByTime(450);
			expect(document.activeElement).toBe(
				screen.getByRole("link", { name: /3 commandes à expédier/i }),
			);
		});

		it("scrolls the active route link into view on open", () => {
			const scrollSpy = vi.fn();
			const originalScrollIntoView = Element.prototype.scrollIntoView;
			Element.prototype.scrollIntoView = scrollSpy as unknown as Element["scrollIntoView"];
			try {
				mockUsePathname.mockReturnValue("/admin/catalogue/produits");
				mockIsOpen.current = true;
				render(<AdminMenuSheet user={defaultUser} />);
				vi.advanceTimersByTime(450);
				expect(scrollSpy).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
			} finally {
				Element.prototype.scrollIntoView = originalScrollIntoView;
			}
		});
	});

	describe("focus-ring SSOT (F2 / F3 — WCAG 2.4.7)", () => {
		it("applies focus-ring on nav links via NAV_ITEM_TACTILE_CLASS", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(link.className).toContain("focus-ring");
		});

		it("applies focus-ring on the search input (replaces raw focus-visible:ring-*)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input.className).toContain("focus-ring");
		});

		it("applies focus-ring on the clear button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "x" } });
			const clearBtn = screen.getByLabelText("Effacer la recherche");
			expect(clearBtn.className).toContain("focus-ring");
		});
	});

	describe("iOS Safari search input hygiene (F4 / F7)", () => {
		it("suppresses the native webkit search cancel button (avoid duplicate X)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input.className).toContain("[&::-webkit-search-cancel-button]:appearance-none");
		});

		it('uses enterKeyHint="done" (live filter, no submit cible)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input).toHaveAttribute("enterKeyHint", "done");
		});
	});

	describe("list semantics (F5 — iOS Safari + VoiceOver)", () => {
		it("renders at least one <ul role='list'> in the default view", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const lists = screen.getAllByRole("list");
			// 3 nav groups + 1 actions card
			expect(lists.length).toBeGreaterThanOrEqual(2);
		});

		it("wraps each nav group link in a <li>", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const productsLink = screen.getByRole("link", { name: /^Produits$/ });
			expect(productsLink.closest("li")).not.toBeNull();
		});

		it("wraps the logout button in a <li>", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const logoutBtn = screen.getByText("Déconnexion").closest("button");
			expect(logoutBtn?.closest("li")).not.toBeNull();
		});

		it("wraps search results in <ul role='list'> + <li>", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			// "remboursements" matche un seul item (évite la collision Produits / Types de produits)
			fireEvent.change(input, { target: { value: "remboursements" } });
			const refundsLink = screen.getByRole("link", { name: /Remboursements/i });
			expect(refundsLink.closest("li")).not.toBeNull();
			expect(refundsLink.closest("ul")).toHaveAttribute("role", "list");
		});
	});

	describe("accent-insensitive search (F6)", () => {
		it('matches "Matériaux" when user types "materiaux" (no accent)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "materiaux" } });
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
		});

		it('still matches "Matériaux" when user types "matériaux" (with accent)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "matériaux" } });
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
		});
	});

	describe("logout button a11y (F8)", () => {
		it('announces aria-haspopup="dialog" on the logout button', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const btn = screen.getByText("Déconnexion").closest("button")!;
			expect(btn).toHaveAttribute("aria-haspopup", "dialog");
		});
	});

	/**
	 * @regression admin-menu-single-dashboard
	 *
	 * Le tableau de bord était rendu DEUX fois : une carte proéminente en tête de
	 * panneau, puis le premier item du groupe `Pilotage`, affiché « Accueil » via
	 * `shortTitle`. Même `href="/admin"` — donc sur `/admin`, deux
	 * `aria-current="page"` dans le même `<nav>`.
	 *
	 * ⚠️ **C'est le renommage qui rendait le doublon invisible**, à l'œil comme au
	 * test : `getByText("Tableau de bord")` n'en trouvait qu'une occurrence, et la
	 * suite restait verte. `getAllNavItems()` documentait pourtant avoir corrigé ce
	 * doublon POUR LA RECHERCHE ; la vue par défaut ne l'avait jamais été.
	 *
	 * On assert donc sur la DESTINATION, jamais sur le libellé.
	 */
	describe("@regression admin-menu-single-dashboard", () => {
		it("ne rend qu'un seul lien vers /admin", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const toDashboard = screen
				.getAllByRole("link")
				.filter((link) => link.getAttribute("href") === "/admin");
			expect(toDashboard).toHaveLength(1);
		});

		it("ne marque qu'un seul élément aria-current=page sur /admin", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const nav = screen.getByLabelText("Navigation administration");
			expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
		});

		it("ne marque qu'un seul élément aria-current=page sur une route de catalogue", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const nav = screen.getByLabelText("Navigation administration");
			expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
		});
	});

	/**
	 * @regression admin-menu-visible-exit
	 *
	 * `handleOnly` + `showCloseButton={false}` + un en-tête `sr-only` + la bottom
	 * bar qui se dépublie à l'ouverture : sur un panneau de 92 dvh, les deux seules
	 * cibles de fermeture (poignée de 8 px, bande de scrim) vivaient dans les 8 %
	 * HAUTS de l'écran — hors de portée du pouce. Les deux autres sheets du dépôt
	 * qui excluaient le contenu du geste rendaient chacune un « Fermer » explicite.
	 *
	 * La fermeture DOIT passer par la primitive : un changement du prop contrôlé ne
	 * rejoue pas `onOpenChange`, donc l'entrée d'historique posée par
	 * `useBackButtonClose` resterait derrière (un « retour » mort par cycle).
	 */
	describe("@regression admin-menu-visible-exit", () => {
		it("rend une sortie visible dans l'en-tête", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const close = screen.getByRole("button", { name: "Fermer le menu" });
			expect(close).toBeInTheDocument();
			expect(close.className).toContain("focus-ring");
			// Cible tactile ≥ 44 px (WCAG 2.5.8) — `size-11` = 2.75rem.
			expect(close.className).toContain("size-11");
		});

		it("ferme PAR LA PRIMITIVE (reprise de l'entrée d'historique)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByRole("button", { name: "Fermer le menu" }));

			// `onOpenChange(false)` du Root, et non un `closeMenu()` direct.
			expect(mockCloseMenu).toHaveBeenCalled();
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});
	});
});
