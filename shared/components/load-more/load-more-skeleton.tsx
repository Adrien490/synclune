import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette du pied de `LoadMore` — compteur + bouton « voir plus ».
 *
 * @description
 * Vit à côté de `load-more.tsx` plutôt que dans le module appelant : la parité
 * anti-CLS est un contrat entre CE bloc et le squelette qui le précède, et une
 * copie rangée ailleurs dérive au premier changement de géométrie.
 *
 * Les mesures suivent `load-more.tsx` : conteneur `flex flex-col items-center
 * gap-2 pt-2`, compteur `text-sm` (20 px de hauteur), bouton `h-11
 * min-w-[200px]` (taille `default` de `Button`).
 *
 * `aria-hidden` : la frontière `Suspense` qui monte ce squelette est déjà
 * annoncée par le `role="status"` de son hôte — un second statut sur un
 * placeholder ferait deux annonces pour un seul chargement.
 */
export function LoadMoreSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col items-center gap-2 pt-2">
			<Skeleton className="h-5 w-40 rounded" />
			<Skeleton className="h-11 w-[200px] rounded-md" />
		</div>
	);
}
