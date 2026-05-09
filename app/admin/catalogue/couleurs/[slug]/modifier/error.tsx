"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function EditColorError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition de couleur n'a pas pu charger"
			route="admin.catalogue.couleurs.modifier"
			backHref="/admin/catalogue/couleurs"
			backLabel="Retour aux couleurs"
		/>
	);
}
