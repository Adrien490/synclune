"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";
import { useOrderFormBackHref } from "@/app/admin/(protected)/ventes/commandes/[id]/_hooks/use-order-form-back-href";

export default function OrderShippingAddressFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useOrderFormBackHref();

	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'adresse de livraison n'a pas pu charger"
			route="admin.ventes.commandes.adresse-livraison"
			backHref={backHref}
			backLabel="Retour à la commande"
		/>
	);
}
