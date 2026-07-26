"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";
import { useOrderFormBackHref } from "@/app/admin/ventes/commandes/[id]/_hooks/use-order-form-back-href";

export default function OrderNotesFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useOrderFormBackHref();

	return (
		<AdminFormErrorBoundary
			{...props}
			title="Les notes de commande n'ont pas pu charger"
			route="admin.ventes.commandes.notes"
			backHref={backHref}
			backLabel="Retour à la commande"
		/>
	);
}
