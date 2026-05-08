"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function SkuDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🏷️"
			title="La variante n'a pas pu charger"
			route="admin.catalogue.produits.variantes.detail"
			fallbackHref="/admin/catalogue/produits"
			fallbackLabel="Retour aux produits"
		/>
	);
}
