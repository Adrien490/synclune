"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";
import { useOrderFormBackHref } from "@/app/admin/(protected)/ventes/commandes/[id]/_hooks/use-order-form-back-href";

export default function OrderTrackingFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useOrderFormBackHref();

	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de suivi n'a pas pu charger"
			route="admin.ventes.commandes.suivi"
			backHref={backHref}
			backLabel="Retour à la commande"
		/>
	);
}
