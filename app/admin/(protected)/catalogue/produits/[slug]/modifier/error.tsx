"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function EditProductError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition du bijou n'a pas pu charger"
			route="admin.catalogue.produits.modifier"
			backHref="/admin/catalogue/produits"
			backLabel="Retour aux produits"
		/>
	);
}
