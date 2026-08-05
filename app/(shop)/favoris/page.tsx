import { WishlistList } from "@/modules/wishlist/components/wishlist-list";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";
import { BreadcrumbNav } from "@/shared/components/breadcrumb-nav";
import { StorefrontHeading } from "@/shared/components/storefront-heading";

import { getWishlist } from "@/modules/wishlist/data/get-wishlist";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes favoris",
	robots: { index: false, follow: false },
};

export default async function WishlistPage() {
	const wishlistPromise = getWishlist();

	return (
		<div className="relative min-h-dvh">
			{/* Shell « L'étal continue » — pas de bande d'en-tête, h1 visible à tous
			    les viewports (l'ancien montage n'avait AUCUN h1 en mobile). Page
			    noindex : aucun JSON-LD, et `BreadcrumbNav` est visuel pur. Pas de
			    countSlot : le compteur optimiste « N article(s) » vit dans
			    `wishlist-list-content.tsx` et doit y rester — un second compteur
			    page-level divergerait au premier retrait. */}
			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					<BreadcrumbNav items={[{ label: "Mes favoris", href: "/favoris" }]} />

					<StorefrontHeading
						title="Mes favoris"
						// Chapô masqué sous `sm` par le `<p>` hôte (lot 0, audit 2026-08-05).
						description="Les pièces que tu as mises de côté. Elles t'attendent ici — ajoute-les au panier quand tu veux."
						descriptionClassName="hidden sm:block"
						// Les cartes produit portent des h3 : ce libellé comble le saut de
						// niveau (WCAG 1.3.1).
						listLabel="Liste des favoris"
					/>

					<Suspense fallback={<WishlistGridSkeleton />}>
						<WishlistList wishlistPromise={wishlistPromise} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}
