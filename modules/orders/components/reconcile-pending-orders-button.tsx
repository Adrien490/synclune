"use client";

import { useActionState } from "react";
import { reconcilePendingOrders } from "@/modules/orders/actions/reconcile-pending-orders";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

/**
 * Filet manuel des réservations orphelines (pas de cron — perte volontaire) :
 * interroge Stripe sur les commandes PENDING de plus de 24 h et applique
 * l'état réel de chaque session (payée → PAID, expirée → CANCELLED + restock).
 */
export function ReconcilePendingOrdersButton() {
	const [, action, isPending] = useActionState(
		withCallbacks(
			reconcilePendingOrders,
			createToastCallbacks({ loadingMessage: "Vérification auprès de Stripe…" }),
		),
		undefined,
	);

	return (
		<form action={action}>
			<Button type="submit" variant="outline" disabled={isPending}>
				{isPending && <Spinner aria-hidden="true" />}
				Vérifier les commandes en attente
			</Button>
		</form>
	);
}
