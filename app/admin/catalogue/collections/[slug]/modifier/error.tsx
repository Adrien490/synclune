"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function EditCollectionError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition de collection n'a pas pu charger"
			route="admin.catalogue.collections.modifier"
			backHref="/admin/catalogue/collections"
			backLabel="Retour aux collections"
		/>
	);
}
