"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewCollectionError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de collection n'a pas pu charger"
			route="admin.catalogue.collections.nouveau"
			backHref="/admin/catalogue/collections"
			backLabel="Retour aux collections"
		/>
	);
}
