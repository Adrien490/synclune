import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { HeartIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

/**
 * Empty state canonique des favoris — partagé entre `wishlist-list.tsx` (vide initial)
 * et `wishlist-list-content.tsx` (vide après suppression optimiste).
 *
 * ⚠️ Ne PAS réintroduire de prop `liveAnnouncement` rendant une région `aria-live`
 * ici : ce composant se monte **avec** l'état vide, donc au même frame que le
 * texte, et une région dans ce cas n'est jamais vocalisée. L'annonce de la
 * transition est faite par `wishlist-list-content.tsx` via `announce()`, qui
 * écrit dans les régions globales déjà montées par `AppToaster`.
 */
export function WishlistEmptyState() {
	return (
		<Empty className="mt-4 mb-12 sm:my-12">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<HeartIcon className="size-6" />
				</EmptyMedia>
				<EmptyTitle>Ta liste de favoris est vide</EmptyTitle>
			</EmptyHeader>
			<EmptyDescription>
				Découvre nos créations artisanales et ajoute tes coups de cœur à tes favoris pour les
				retrouver facilement.
			</EmptyDescription>
			<EmptyActions>
				<Button render={<Link href="/produits" />} variant="primary" size="lg">
					Découvrir nos créations
				</Button>
				<Button render={<Link href="/collections" />} variant="outline" size="lg">
					Voir les collections
				</Button>
			</EmptyActions>
		</Empty>
	);
}
