"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function EditProductTypeError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition de type n'a pas pu charger"
			route="admin.catalogue.types-de-produits.modifier"
			backHref="/admin/catalogue/types-de-produits"
			backLabel="Retour aux types"
		/>
	);
}
