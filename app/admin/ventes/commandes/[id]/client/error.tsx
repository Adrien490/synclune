"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";
import { useOrderFormBackHref } from "@/app/admin/ventes/commandes/[id]/_hooks/use-order-form-back-href";

export default function OrderCustomerFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useOrderFormBackHref();

	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire client n'a pas pu charger"
			route="admin.ventes.commandes.client"
			backHref={backHref}
			backLabel="Retour à la commande"
		/>
	);
}
