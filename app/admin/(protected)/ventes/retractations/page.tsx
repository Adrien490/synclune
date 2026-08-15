import { type Metadata } from "next";
import { Suspense } from "react";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getRetractations } from "@/modules/retractations/data/get-retractations";
import { RetractationsList } from "@/modules/retractations/components/admin/retractations-list";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Rétractations - Administration",
	description: "Gérer les demandes de rétractation",
};

export default async function AdminRetractationsPage() {
	await assertAdminPage();

	const retractationsPromise = getRetractations();

	return (
		<>
			<PageHeader variant="compact" title="Rétractations" />
			<div className="space-y-4">
				<p className="text-muted-foreground max-w-prose text-sm">
					Les demandes arrivent depuis les pages de suivi de commande. Le remboursement doit
					intervenir sous 14 jours après la demande — l&apos;échéance est affichée sur chaque ligne.
				</p>
				<Suspense
					fallback={
						<div className="space-y-2">
							<Skeleton shape="rounded" className="h-24 w-full" />
							<Skeleton shape="rounded" className="h-24 w-full" />
						</div>
					}
				>
					<RetractationsList retractationsPromise={retractationsPromise} />
				</Suspense>
			</div>
		</>
	);
}
