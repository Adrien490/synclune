"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function OrderDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🛒"
			title="Cette commande n'a pas pu charger"
			route="admin.ventes.commandes.detail"
			fallbackHref="/admin/ventes/commandes"
			fallbackLabel="Retour aux commandes"
		/>
	);
}
