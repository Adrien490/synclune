import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Heart } from "lucide-react";
import Link from "next/link";

interface WishlistEmptyStateProps {
	/**
	 * Si fourni, rend une live region polite avec ce message.
	 * Utilisé après suppression optimiste pour annoncer le passage à l'état vide.
	 */
	liveAnnouncement?: string;
}

/**
 * Empty state canonique des favoris — partagé entre `wishlist-list.tsx` (vide initial)
 * et `wishlist-list-content.tsx` (vide après suppression optimiste).
 */
export function WishlistEmptyState({ liveAnnouncement }: WishlistEmptyStateProps) {
	return (
		<>
			<Empty className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Heart className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Votre liste de favoris est vide</EmptyTitle>
				</EmptyHeader>
				<EmptyDescription>
					Découvrez nos créations artisanales et ajoutez vos coups de cœur à vos favoris pour les
					retrouver facilement.
				</EmptyDescription>
				<EmptyActions>
					<Button asChild variant="primary" size="lg">
						<Link href="/produits">Découvrir nos créations</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link href="/collections">Voir les collections</Link>
					</Button>
				</EmptyActions>
			</Empty>

			{liveAnnouncement && (
				<div role="status" aria-live="polite" className="sr-only">
					{liveAnnouncement}
				</div>
			)}
		</>
	);
}
