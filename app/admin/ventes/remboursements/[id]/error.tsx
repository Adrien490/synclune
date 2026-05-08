"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function RefundDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="💸"
			title="Ce remboursement n'a pas pu charger"
			route="admin.ventes.remboursements.detail"
		/>
	);
}
