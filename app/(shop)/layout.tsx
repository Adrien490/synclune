import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { ShopMobileBottomNav } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";

import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";
import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { Suspense, ViewTransition } from "react";
import {
	PAGE_CONTENT_VIEW_TRANSITION_NAME,
	PAGE_FADE_TRANSITION_TYPE,
} from "@/shared/constants/view-transitions";
import { CartAndVariantWrapper } from "@/modules/cart/components/cart-and-variant-wrapper";
import { QuickSearchDialogAsync } from "@/modules/products/components/quick-search-dialog/quick-search-dialog-async";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default function ShopLayout({ children }: ShopLayoutProps) {
	return (
		<Suspense fallback={<ShopShellSkeleton />}>
			<ShopLayoutContent>{children}</ShopLayoutContent>
		</Suspense>
	);
}

/**
 * Coque servie tant que `getStoreStatus() + getSession()` n'ont pas résolu — et
 * c'est aussi ce que PPR prérend dans le shell statique.
 *
 * ⚠️ Cette frontière n'avait **aucun** `fallback` jusqu'au 2026-08-07. Les deux
 * `<Suspense fallback={<NavbarSkeleton />}>` / `{<FooterSkeleton />}` ci-dessous
 * sont à l'INTÉRIEUR de `ShopLayoutContent` : ils ne pouvaient donc jamais
 * s'afficher, et la boutique rendait du vide au lieu de sa coque. Les deux
 * squelettes existaient, personne ne les voyait.
 */
function ShopShellSkeleton() {
	return (
		<>
			<NavbarSkeleton />
			<main id="main-content" data-shop-shell tabIndex={-1} className="min-h-dvh" />
			<FooterSkeleton />
		</>
	);
}

async function ShopLayoutContent({ children }: ShopLayoutProps) {
	// Plus de « boutique fermée » : StoreSettings est parti avec le schéma lean
	// (perte volontaire § 1, lot 2).
	return (
		<>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			{/* Frontière View Transition du storefront. React démarre lui-même la
			    transition sur `router.push`/`replace` (déjà enveloppés dans
			    `startTransition`) et n'anime QU'UNE FOIS le nouveau contenu prêt —
			    c'est ce qui remplace `withViewTransition()`, dont le snapshot
			    partait avant le montage de la page suivante.

			    ⚠️ Les DEUX `none` sont mesurés, pas prudentiels. Sans celui de
			    `update`, chaque tronçon streamé par PPR rejoue le fondu (4
			    transitions enchaînées au premier rendu de `/produits`) ; sans le
			    `default`, c'est l'ENTRÉE de la frontière — quand la coquille
			    `ShopShellSkeleton` cède la place au contenu — qui en démarre une
			    de plus, en plein chemin du LCP. Seule une navigation qui réclame
			    `PAGE_FADE_TRANSITION_TYPE` anime. */}
			<ViewTransition
				default="none"
				name={PAGE_CONTENT_VIEW_TRANSITION_NAME}
				update={{ [PAGE_FADE_TRANSITION_TYPE]: "auto", default: "none" }}
			>
				{/* `data-shop-shell` : marqueur lu par `html:has(…)` dans globals.css pour
				    poser le `scroll-padding-bottom` de la bottom-nav (WCAG 2.4.11). Même
				    montage que `[data-admin-layout]` et `[data-checkout-shell]`. */}
				<main
					id="main-content"
					data-shop-shell
					tabIndex={-1}
					aria-label="Contenu principal"
					className="min-h-dvh"
				>
					{children}
				</main>
			</ViewTransition>
			<Suspense fallback={<FooterSkeleton />}>
				<Footer />
			</Suspense>
			<CartAndVariantWrapper />
			<Suspense fallback={null}>
				<QuickSearchDialogAsync />
			</Suspense>
			<Suspense fallback={null}>
				<AdminDashboardFab />
			</Suspense>
			<ShopMobileBottomNav />
			{/* Pas de pull-to-refresh sur le storefront : le contenu vient de caches longs
			    (`catalog` 15 min, `reference` 24 h) qu'un `router.refresh()` ne renouvelle
			    pas. Le geste n'y aurait rien à rafraîchir — il est réservé aux surfaces
			    admin, où il partage le chemin d'invalidation des boutons « Rafraîchir »
			    (cf. `use-pull-to-refresh-handler`). */}
			<SentryUserBridge />
			<CookieBannerLazy />
		</>
	);
}
