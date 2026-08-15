"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function NewVariantError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de variante n'a pas pu charger"
			route="admin.catalogue.produits.variantes.nouveau"
			backHref="/admin/catalogue/produits"
			backLabel="Retour aux produits"
		/>
	);
}
