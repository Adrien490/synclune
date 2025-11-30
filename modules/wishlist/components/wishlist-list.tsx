import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { WishlistListContent } from "./wishlist-list-content";
import type { GetWishlistReturn } from "@/modules/wishlist/data/get-wishlist";
import { Heart } from "lucide-react";
import Link from "next/link";

interface WishlistListProps {
	wishlistPromise: Promise<GetWishlistReturn>;
	perPage: number;
}

/**
 * Liste de la wishlist avec pagination - Server Component
 *
 * Pattern :
 * - Reçoit une Promise de wishlist paginée
 * - Affiche un empty state si aucun item
 * - Délègue l'affichage avec optimistic updates au Client Component
 */
export async function WishlistList({
	wishlistPromise,
	perPage,
}: WishlistListProps) {
	const { items, pagination, totalCount } = await wishlistPromise;

	// Empty state si aucun item
	if (!items || items.length === 0) {
		return (
			<Empty className="my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Heart className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Votre wishlist est vide</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-muted-foreground max-w-md mb-6">
						Découvrez nos créations artisanales et ajoutez vos coups de cœur à
						votre wishlist pour les retrouver facilement.
					</p>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button asChild variant="primary" size="lg">
							<Link href="/produits">Découvrir nos créations</Link>
						</Button>
						<Button asChild variant="primary" size="lg">
							<Link href="/collections">Voir les collections</Link>
						</Button>
					</div>
				</EmptyContent>
			</Empty>
		);
	}

	// Déléguer au Client Component pour les optimistic updates
	return (
		<WishlistListContent
			items={items}
			pagination={pagination}
			totalCount={totalCount}
			perPage={perPage}
		/>
	);
}
