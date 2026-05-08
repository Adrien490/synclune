"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function OrdersAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🧾"
			title="Les commandes n'ont pas pu charger"
			route="admin.ventes.commandes"
		/>
	);
}
