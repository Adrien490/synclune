"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function ProductTypesAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🏷️"
			title="Les types de produits n'ont pas pu charger"
			route="admin.catalogue.types-de-produits"
			fallbackHref="/admin/catalogue"
			fallbackLabel="Retour au catalogue"
		/>
	);
}
