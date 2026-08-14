import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockUsePathname,
	mockUseRouter,
	mockUseIsScrolled,
	mockTriggerHaptic,
	mockGenerateBreadcrumbs,
	mockRouterBack,
	mockRouterPush,
} = vi.hoisted(() => ({
	mockUsePathname: vi.fn(),
	mockUseRouter: vi.fn(),
	mockUseIsScrolled: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockGenerateBreadcrumbs: vi.fn(),
	mockRouterBack: vi.fn(),
	mockRouterPush: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
	useRouter: mockUseRouter,
}));

vi.mock("@/shared/hooks/use-is-scrolled", () => ({
	useIsScrolled: mockUseIsScrolled,
}));

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

vi.mock("../generate-breadcrumbs", () => ({
	generateBreadcrumbs: mockGenerateBreadcrumbs,
}));

import { AdminMobileHeader } from "../admin-mobile-header";
import { AdminPageTitleProvider, useSetAdminPageTitle } from "../admin-page-title-context";

/** Page factice qui publie un titre, comme le font les detail headers. */
function PublishingPage({ title }: { title: string }) {
	useSetAdminPageTitle(title);
	return null;
}

// ============================================================================
// HELPERS
// ============================================================================

interface Segment {
	label: string;
	href: string;
	isCurrentPage: boolean;
}

const breadcrumbs = {
	home: (): Segment[] => [{ label: "Tableau de bord", href: "/admin", isCurrentPage: true }],
	list: (): Segment[] => [
		{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
		{ label: "Catalogue", href: "/admin/catalogue", isCurrentPage: false },
		{ label: "Produits", href: "/admin/catalogue/produits", isCurrentPage: true },
	],
	/**
	 * Fixture « route de détail à id opaque, avec eyebrow parent + bouton retour ».
	 *
	 * C'était `/admin/clients/abc-123` ; la surface a disparu au retrait de l'espace
	 * client (2026-07-31) et ne matche donc plus `DETAIL_ROUTE_PATTERNS`. Remplacée
	 * par le détail remboursement, qui a exactement la même forme (id opaque, parent
	 * nommé) et existe toujours.
	 */
	refundDetail: (): Segment[] => [
		{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
		{ label: "Remboursements", href: "/admin/ventes/remboursements", isCurrentPage: false },
		{
			label: "abc-123",
			href: "/admin/ventes/remboursements/abc-123",
			isCurrentPage: true,
		},
	],
	storeClose: (): Segment[] => [
		{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
		{ label: "Configuration", href: "/admin/configuration", isCurrentPage: false },
		{ label: "Boutique", href: "/admin/configuration/boutique", isCurrentPage: false },
		{ label: "Fermer", href: "/admin/configuration/boutique/fermer", isCurrentPage: true },
	],
};

function setup(opts: {
	pathname: string;
	segments: Segment[];
	isScrolled?: boolean;
	historyLength?: number;
}) {
	mockUsePathname.mockReturnValue(opts.pathname);
	mockGenerateBreadcrumbs.mockReturnValue(opts.segments);
	mockUseIsScrolled.mockReturnValue(opts.isScrolled ?? false);
	mockUseRouter.mockReturnValue({ back: mockRouterBack, push: mockRouterPush });
	if (opts.historyLength !== undefined) {
		Object.defineProperty(window.history, "length", {
			value: opts.historyLength,
			configurable: true,
		});
	}
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	// Reset history.length entre chaque test (JSDOM par défaut: 1).
	Object.defineProperty(window.history, "length", { value: 1, configurable: true });
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMobileHeader", () => {
	describe("title rendering", () => {
		/**
		 * Le titre du header est du CHROME de navigation : il ne doit PAS être un
		 * `<h1>`. Chacune des 11 fiches de détail rend déjà son propre `<h1>` — en
		 * émettre un second ici donnait deux h1 par page sur mobile.
		 */
		function title(name: string) {
			return screen.getByText(name, { selector: "p" });
		}

		it("rend le libellé du breadcrumb courant", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home() });
			render(<AdminMobileHeader />);
			expect(title("Tableau de bord")).toBeInTheDocument();
		});

		it("n'émet AUCUN h1 — la structure du document appartient à la page", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
			});
			render(<AdminMobileHeader />);
			expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
		});

		it("falls back to 'Administration' when breadcrumbs is empty", () => {
			setup({ pathname: "/admin", segments: [] });
			render(<AdminMobileHeader />);
			expect(title("Administration")).toBeInTheDocument();
		});

		it("uses text-lg when no parent shown (list route)", () => {
			setup({ pathname: "/admin/catalogue/produits", segments: breadcrumbs.list() });
			render(<AdminMobileHeader />);
			const heading = title("Produits");
			expect(heading.className).toContain("text-lg");
			expect(heading.className).not.toContain("text-base");
		});

		it("uses text-base when parent eyebrow shown (detail route)", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
			});
			render(<AdminMobileHeader />);
			expect(title("abc-123").className).toContain("text-base");
		});

		describe("titre publié par la page (ressources à id opaque)", () => {
			it("préfère le titre publié au segment de breadcrumb dérivé de l'id", () => {
				setup({
					pathname: "/admin/ventes/remboursements/abc-123",
					segments: breadcrumbs.refundDetail(),
				});
				render(
					<AdminPageTitleProvider>
						<AdminMobileHeader />
						<PublishingPage title="Camille Durand" />
					</AdminPageTitleProvider>,
				);

				expect(title("Camille Durand")).toBeInTheDocument();
				expect(screen.queryByText("abc-123", { selector: "p" })).not.toBeInTheDocument();
			});

			it("annonce le titre publié dans la live region, pas l'id", () => {
				setup({
					pathname: "/admin/ventes/remboursements/abc-123",
					segments: breadcrumbs.refundDetail(),
				});
				render(
					<AdminPageTitleProvider>
						<AdminMobileHeader />
						<PublishingPage title="Camille Durand" />
					</AdminPageTitleProvider>,
				);

				expect(screen.getByRole("status").textContent).toBe("Page actuelle : Camille Durand");
			});

			it("retombe sur le breadcrumb quand la page ne publie rien (listes)", () => {
				setup({ pathname: "/admin/catalogue/produits", segments: breadcrumbs.list() });
				render(
					<AdminPageTitleProvider>
						<AdminMobileHeader />
					</AdminPageTitleProvider>,
				);

				expect(title("Produits")).toBeInTheDocument();
			});
		});
	});

	describe("back button visibility", () => {
		it("does NOT render back button on /admin (home)", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home() });
			render(<AdminMobileHeader />);
			expect(screen.queryByRole("button", { name: "Retour" })).not.toBeInTheDocument();
		});

		it("does NOT render back button on list routes", () => {
			setup({ pathname: "/admin/catalogue/produits", segments: breadcrumbs.list() });
			render(<AdminMobileHeader />);
			expect(screen.queryByRole("button", { name: "Retour" })).not.toBeInTheDocument();
		});

		it("renders back button on refund detail route", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
			});
			render(<AdminMobileHeader />);
			expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
		});

		it.each([
			["/admin/catalogue/produits/abc", breadcrumbs.list],
			["/admin/catalogue/produits/nouveau", breadcrumbs.list],
			["/admin/catalogue/produits/abc/variantes/xyz", breadcrumbs.list],
			["/admin/ventes/commandes/abc/notes", breadcrumbs.list],
			["/admin/configuration/boutique/fermer", breadcrumbs.storeClose],
		])("renders back button on detail route %s", (pathname, segmentsFn) => {
			setup({ pathname, segments: segmentsFn() });
			render(<AdminMobileHeader />);
			expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
		});
	});

	describe("parent eyebrow", () => {
		it("renders parent label as uppercase eyebrow on detail route", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
			});
			render(<AdminMobileHeader />);
			const eyebrow = screen.getByText("Remboursements");
			expect(eyebrow.className).toContain("uppercase");
			expect(eyebrow.className).toContain("text-2xs");
		});

		it("does NOT render eyebrow on non-detail route even if breadcrumbs has parent", () => {
			setup({ pathname: "/admin/catalogue/produits", segments: breadcrumbs.list() });
			render(<AdminMobileHeader />);
			// "Catalogue" is the parent label but should NOT render because showBack is false.
			// Use queryAllByText to be tolerant of unrelated occurrences.
			const matches = screen.queryAllByText("Catalogue");
			const eyebrowMatch = matches.find((el) => el.className.includes("uppercase"));
			expect(eyebrowMatch).toBeUndefined();
		});
	});

	describe("back button behavior", () => {
		it("fires haptic 'light' + router.back() when history has entries", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
				historyLength: 5,
			});
			render(<AdminMobileHeader />);
			fireEvent.click(screen.getByRole("button", { name: "Retour" }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
			expect(mockRouterBack).toHaveBeenCalledTimes(1);
			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it("falls back to router.push(parentHref) when history is empty (deep-link)", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
				historyLength: 1,
			});
			render(<AdminMobileHeader />);
			fireEvent.click(screen.getByRole("button", { name: "Retour" }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/ventes/remboursements");
			expect(mockRouterBack).not.toHaveBeenCalled();
		});
	});

	describe("scroll state (compositor-friendly glass)", () => {
		it("exposes data-scrolled='false' initially", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home(), isScrolled: false });
			const { container } = render(<AdminMobileHeader />);
			const header = container.querySelector("header");
			expect(header).toHaveAttribute("data-scrolled", "false");
		});

		it("exposes data-scrolled='true' when scrolled past threshold", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home(), isScrolled: true });
			const { container } = render(<AdminMobileHeader />);
			const header = container.querySelector("header");
			expect(header).toHaveAttribute("data-scrolled", "true");
		});

		it("renders a dedicated glass layer (aria-hidden, opacity-only transition)", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home(), isScrolled: false });
			const { container } = render(<AdminMobileHeader />);
			const glassLayer = container.querySelector("[aria-hidden='true']");
			expect(glassLayer).not.toBeNull();
			expect(glassLayer?.className).toContain("opacity-0");
			expect(glassLayer?.className).toContain("group-data-[scrolled=true]:opacity-100");
			// La transition doit cibler uniquement l'opacité (pas background-color/border/shadow).
			expect(glassLayer?.className).toContain("motion-safe:transition-opacity");
			expect(glassLayer?.className).not.toContain("transition-[background-color");
		});
	});

	describe("a11y", () => {
		it("renders banner landmark with aria-label", () => {
			setup({ pathname: "/admin", segments: breadcrumbs.home() });
			render(<AdminMobileHeader />);
			expect(
				screen.getByRole("banner", { name: "En-tête mobile administration" }),
			).toBeInTheDocument();
		});

		it("renders SR status announcement with current page title", () => {
			setup({
				pathname: "/admin/ventes/remboursements/abc-123",
				segments: breadcrumbs.refundDetail(),
			});
			render(<AdminMobileHeader />);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveAttribute("aria-atomic", "true");
			expect(status.textContent).toBe("Page actuelle : abc-123");
		});
	});
});
