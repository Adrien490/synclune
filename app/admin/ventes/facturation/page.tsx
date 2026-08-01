import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { PageHeader } from "@/shared/components/page-header";
import { getInvoicingOverview } from "@/modules/invoices/data/get-invoicing-overview";
import { InvoicingOverviewSection } from "@/modules/invoices/components/admin/invoicing-overview";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Facturation - Administration",
	description: "État des factures émises, anomalies et export comptable",
};

export default async function FacturationAdminPage() {
	await assertAdminPage();

	const overview = await getInvoicingOverview();
	if (!overview) {
		// isAdmin guard refusal — comportement minimal (en pratique la page admin
		// est déjà protégée par le layout, mais defense in depth).
		notFound();
	}

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes">Ventes</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Facturation</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Plus de mention e-reporting : la machinerie DGFiP a été retirée du
			    code le 2026-07-26 (à réécrire au go-live contre l'arrêté définitif
			    et une Plateforme Agréée réelle — cf. docs/RUNBOOK.md). */}
			<PageHeader
				variant="compact"
				title="Facturation"
				description="Factures émises, anomalies et export comptable (Art. 286 / 289-I / L102 B)"
			/>

			<InvoicingOverviewSection overview={overview} />
		</div>
	);
}
