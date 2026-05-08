"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ProductsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="💎"
			title="Les bijoux n'ont pas pu charger"
			route="admin.catalogue.produits"
			fallbackHref="/admin/catalogue"
			fallbackLabel="Retour au catalogue"
		/>
	);
}
