"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewProductError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de produit n'a pas pu charger"
			route="admin.catalogue.produits.nouveau"
			backHref="/admin/catalogue/produits"
			backLabel="Retour aux produits"
		/>
	);
}
