"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function InvoicingError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🧾"
			title="La facturation n'a pas pu charger"
			route="admin.ventes.facturation"
			fallbackHref="/admin/ventes"
			fallbackLabel="Retour aux ventes"
		/>
	);
}
