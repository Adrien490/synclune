"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function NewMaterialError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de matériau n'a pas pu charger"
			route="admin.catalogue.materiaux.nouveau"
			backHref="/admin/catalogue/materiaux"
			backLabel="Retour aux matériaux"
		/>
	);
}
