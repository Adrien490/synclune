"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";

export default function CloseStoreError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de fermeture de boutique n'a pas pu charger"
			route="admin.configuration.boutique.fermer"
			backHref="/admin/configuration/boutique"
			backLabel="Retour à la configuration"
		/>
	);
}
