"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function RefundsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="↩️"
			title="Les remboursements n'ont pas pu charger"
			route="admin.ventes.remboursements"
			fallbackHref="/admin/ventes"
			fallbackLabel="Retour aux ventes"
		/>
	);
}
