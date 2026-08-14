"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function ProductTypeDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🏷️"
			title="Le type n'a pas pu charger"
			route="admin.catalogue.types-de-produits.detail"
			fallbackHref="/admin/catalogue/types-de-produits"
			fallbackLabel="Retour aux types"
		/>
	);
}
