import { PageHeader } from "@/shared/components/page-header"
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles"
import { ParticleSystem } from "@/shared/components/animations/particle-system"
import {
	GET_WISHLIST_DEFAULT_PER_PAGE,
	getWishlist,
} from '@/modules/wishlist/data/get-wishlist'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClearWishlistAlertDialog } from '@/modules/wishlist/components/clear-wishlist-alert-dialog'
import { RemoveWishlistItemAlertDialog } from '@/modules/wishlist/components/remove-wishlist-item-alert-dialog'
import { WishlistGridSkeleton } from '@/modules/wishlist/components/wishlist-grid-skeleton'
import { WishlistList } from '@/modules/wishlist/components/wishlist-list'

export const metadata: Metadata = {
	title: 'Mes Favoris - Synclune | Bijoux artisanaux',
	description:
		'Retrouvez tous vos bijoux artisanaux favoris dans votre liste de favoris Synclune.',
	alternates: {
		canonical: '/favoris',
	},
	robots: {
		index: false,
		follow: false,
	},
}

type WishlistPageProps = {
	searchParams: Promise<{
		cursor?: string
		direction?: 'forward' | 'backward'
		perPage?: string
	}>
}

/**
 * Page Favoris - Server Component avec SSR optimisé et pagination
 *
 * Architecture Next.js 16 :
 * - Server Component pour SSR optimal
 * - Suspense boundary pour progressive rendering
 * - Cache 5min (read-your-own-writes via updateTags)
 * - Accessible aux guests (favoris session cookie)
 * - Pagination cursor-based pour performance
 *
 * UX :
 * - Empty state si favoris vide
 * - Grid responsive (2/3/4 colonnes)
 * - Actions rapides (remove + add to cart)
 * - Navigation par curseur (prev/next)
 */
export default async function FavorisPage({
	searchParams,
}: WishlistPageProps) {
	const params = await searchParams

	// Helper pour extraire les paramètres
	const getFirstParam = (
		param: string | string[] | undefined
	): string | undefined => {
		if (Array.isArray(param)) return param[0]
		return param
	}

	// Récupérer les paramètres de pagination
	const cursor = getFirstParam(params.cursor)
	const direction = (getFirstParam(params.direction) || 'forward') as
		| 'forward'
		| 'backward'
	const perPage =
		Number(getFirstParam(params.perPage)) || GET_WISHLIST_DEFAULT_PER_PAGE

	// Récupérer la wishlist paginée (avec cache 5min)
	const wishlistPromise = getWishlist({
		cursor,
		direction,
		perPage,
	})

	const breadcrumbs = [
		{ label: 'Mes favoris', href: '/favoris' },
	]

	return (
		<div className="min-h-screen relative">
			{/* Background décoratif - Particules + paillettes pour favoris */}
			<ParticleSystem variant="minimal" className="fixed inset-0 z-0" />
			<GlitterSparkles count={30} sizeRange={[2, 5]} glowIntensity={0.8} />

			<PageHeader title="Mes favoris" breadcrumbs={breadcrumbs} />

			<div className="bg-background py-8 relative z-10">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
					<Suspense fallback={<WishlistGridSkeleton />}>
						<WishlistList wishlistPromise={wishlistPromise} perPage={perPage} />
					</Suspense>
				</div>
			</div>

			{/* Dialogs de confirmation */}
			<RemoveWishlistItemAlertDialog />
			<ClearWishlistAlertDialog />
		</div>
	)
}
