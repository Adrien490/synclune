"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewRefundError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de remboursement n'a pas pu charger"
			route="admin.ventes.remboursements.nouveau"
			backHref="/admin/ventes/remboursements"
			backLabel="Retour aux remboursements"
		/>
	);
}
