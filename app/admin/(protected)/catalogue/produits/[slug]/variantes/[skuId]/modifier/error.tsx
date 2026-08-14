"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function EditSkuError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition de variante n'a pas pu charger"
			route="admin.catalogue.produits.variantes.modifier"
			backHref="/admin/catalogue/produits"
			backLabel="Retour aux produits"
		/>
	);
}
