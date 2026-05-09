"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewColorError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de couleur n'a pas pu charger"
			route="admin.catalogue.couleurs.nouveau"
			backHref="/admin/catalogue/couleurs"
			backLabel="Retour aux couleurs"
		/>
	);
}
