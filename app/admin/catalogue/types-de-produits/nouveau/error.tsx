"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewProductTypeError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de type n'a pas pu charger"
			route="admin.catalogue.types-de-produits.nouveau"
			backHref="/admin/catalogue/types-de-produits"
			backLabel="Retour aux types"
		/>
	);
}
