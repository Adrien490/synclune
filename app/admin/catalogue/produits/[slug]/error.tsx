"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ProductDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="📦"
			title="Le bijou n'a pas pu charger"
			route="admin.catalogue.produits.detail"
			fallbackHref="/admin/catalogue/produits"
			fallbackLabel="Retour aux produits"
		/>
	);
}
