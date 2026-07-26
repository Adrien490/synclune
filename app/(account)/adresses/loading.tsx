import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";

/**
 * Squelette de `/adresses` — réutilise celui du `<Suspense>` interne de la page,
 * donc parité garantie.
 *
 * Le `loading.tsx` de groupe réservait un titre + sous-titre inexistants (ils
 * vivent dans le layout `(account)`) et une grille `lg:grid-cols-3` que cette page
 * ne rend pas.
 */
export default function AddressesLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement de vos adresses">
			<span className="sr-only">Chargement de vos adresses…</span>
			<AddressListSkeleton />
		</div>
	);
}
