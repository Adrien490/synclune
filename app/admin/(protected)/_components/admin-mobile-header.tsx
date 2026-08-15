"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import { usePathname, useRouter } from "next/navigation";
import { useAdminPageTitle } from "./admin-page-title-context";
import { generateBreadcrumbs } from "./generate-breadcrumbs";

const DETAIL_ROUTE_PATTERNS = [
	// Catalogue — detail + edit + create (5 resources)
	/^\/admin\/catalogue\/(collections|couleurs|materiaux|produits|types-de-produits)\/[^/]+(\/modifier)?$/,
	/^\/admin\/catalogue\/(collections|couleurs|materiaux|produits|types-de-produits)\/nouveau$/,
	// Catalogue — liste des variantes d'un produit : c'est une sous-page de la fiche
	// produit, elle a donc besoin du retour. Elle portait à la place deux affordances
	// dans le corps de page (carte de contexte + flèche), désormais retirées.
	/^\/admin\/catalogue\/produits\/[^/]+\/variantes$/,
	// Catalogue — VARIANT variantes (detail + edit + create + inline forms stock/prix)
	/^\/admin\/catalogue\/produits\/[^/]+\/variantes\/(nouveau|[^/]+(\/(modifier|stock|prix))?)$/,
	// Ventes — commandes et rétractations (pages de détail)
	/^\/admin\/ventes\/commandes\/[^/]+$/,
	/^\/admin\/ventes\/retractations\/[^/]+$/,
];

function isDetailRoute(pathname: string): boolean {
	return DETAIL_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Mobile header for admin pages.
 * Shows current page title + contextual actions. Hidden on md+.
 * Scroll-aware: transparent at top, glass effect on scroll.
 *
 * Architecture compositor-friendly (mirror `NavbarWrapper`) :
 * - Glass effect (backdrop, shadow, border) sur calque absolu dédié dont seule
 *   l'opacité est animée — pas de transitions sur background-color/border-color/
 *   box-shadow/backdrop-filter (paint thrash sur iOS Safari pendant le scroll).
 * - `data-scrolled` exposé pour des animations enfants éventuelles.
 *
 * Navigation redundancies by design:
 * - Bottom bar covers primary nav (Accueil, Commandes, Produits, Menu sheet).
 * - Back button (here) appears on detail routes — l'alternative visible au geste de
 *   retour natif du navigateur (swipe depuis le bord), qui n'est ni garanti ni
 *   découvrable. Fallback `router.push(parentHref)` quand `history.length <= 1`
 *   (deep-link / nouvel onglet).
 */
export function AdminMobileHeader() {
	const pathname = usePathname();
	const router = useRouter();
	const isScrolled = useIsScrolled(20);
	const breadcrumbs = generateBreadcrumbs(pathname);
	// Titre publié par la page de détail s'il existe, sinon dérivation breadcrumb.
	// Sur les ressources à id opaque, le fallback affichait l'id Title-Casé.
	const publishedTitle = useAdminPageTitle();
	const pageTitle =
		publishedTitle ?? breadcrumbs[breadcrumbs.length - 1]?.label ?? "Administration";

	const showBack = isDetailRoute(pathname);
	const parentSegment = breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : null;
	const parentLabel = parentSegment?.label ?? null;
	const parentHref = parentSegment?.href ?? "/admin";
	const showParent = Boolean(showBack && parentLabel);

	const handleBack = () => {
		triggerHaptic("light");
		// Fallback parent quand l'historique est vide (deep-link, nouvel onglet).
		// `history.length === 1` couvre 95% des cas. Hors-scope : referrer cross-origin.
		if (typeof window !== "undefined" && window.history.length <= 1) {
			router.push(parentHref);
			return;
		}
		router.back();
	};

	return (
		<header
			data-scrolled={isScrolled}
			data-admin-mobile-header
			className={cn(
				"pwa-header group fixed inset-x-0 top-0 z-40 flex min-h-[var(--admin-header-height,3.5rem)] items-center md:hidden",
			)}
			aria-label="En-tête mobile administration"
		>
			{/* Glass effect layer — opacity-only (compositor-friendly). */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 -z-10",
					"bg-background/80 border-border border-b shadow-lg shadow-black/8 backdrop-blur-xl",
					"opacity-0 motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:ease-out",
					"group-data-[scrolled=true]:opacity-100",
				)}
			/>

			<div className="flex w-full items-center gap-2 px-[var(--admin-main-x,1.5rem)]">
				{showBack && (
					<button
						type="button"
						onClick={handleBack}
						aria-label="Retour"
						className={cn(
							"-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full",
							"text-muted-foreground can-hover:hover:text-foreground active:bg-accent",
							"focus-ring",
							"motion-safe:transition-colors",
						)}
					>
						<CaretLeftIcon className="size-5" aria-hidden="true" />
					</button>
				)}

				<div className="min-w-0 flex-1">
					{showParent && (
						<p className="text-muted-foreground text-2xs mb-0.5 truncate leading-none font-medium tracking-wider uppercase">
							{parentLabel}
						</p>
					)}
					{/* `<p>` et non `<h1>` : ce titre est du CHROME de navigation, pas la
					    structure du document. Chacune des 11 fiches de détail rend déjà son
					    propre `<h1>` — en émettre un second ici donnait deux h1 par page sur
					    mobile. Le `role="status"` ci-dessous porte l'annonce de changement. */}
					<p
						className={cn(
							"font-display min-w-0 truncate text-left leading-none font-normal tracking-normal",
							showParent ? "text-base" : "text-lg",
						)}
					>
						{pageTitle}
					</p>
				</div>

				<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					Page actuelle : {pageTitle}
				</span>
			</div>
		</header>
	);
}
