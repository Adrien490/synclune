"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function EditMaterialError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition de matériau n'a pas pu charger"
			route="admin.catalogue.materiaux.modifier"
			backHref="/admin/catalogue/materiaux"
			backLabel="Retour aux matériaux"
		/>
	);
}
