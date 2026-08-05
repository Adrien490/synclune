import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";
import { BreadcrumbNavSkeleton } from "@/shared/components/breadcrumb-nav";
import { StorefrontHeadingSkeleton } from "@/shared/components/storefront-heading";

/** Miroir 1:1 du shell de `page.tsx` — même section, mêmes espacements (CLS). */
export default function WishlistLoading() {
	return (
		<div
			className="relative min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement des favoris"
		>
			<span className="sr-only">Chargement des favoris…</span>

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					<BreadcrumbNavSkeleton />
					{/* `descriptionLines={2}` : la copie du chapô de `page.tsx` est
					    statique (95 caractères) et rend DEUX lignes dans son
					    `max-w-[42ch]` à `sm+` (audit 79/100 du 2026-08-05). */}
					<StorefrontHeadingSkeleton hasCount={false} descriptionLines={2} />
					<WishlistGridSkeleton />
				</div>
			</section>
		</div>
	);
}
