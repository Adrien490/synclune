import { CustomerOrdersTableSkeleton } from "@/modules/orders/components/customer/customer-orders-table-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de `/commandes`.
 *
 * Le `loading.tsx` de groupe réservait un titre + sous-titre (inexistants : le
 * `h1` et les onglets vivent dans le layout `(account)`) puis une grille
 * `lg:grid-cols-3` — alors que cette page rend un bouton de rafraîchissement
 * aligné à droite au-dessus d'une table pleine largeur. Réutilise le même
 * squelette que le `<Suspense>` interne de la page, donc parité garantie.
 */
export default function CustomerOrdersLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de vos commandes"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de vos commandes…</span>

			{/* `RefreshUserOrdersButton` — aligné à droite */}
			<div className="flex justify-end">
				<Skeleton className="h-9 w-36" shape="rounded" />
			</div>

			<CustomerOrdersTableSkeleton />
		</div>
	);
}
