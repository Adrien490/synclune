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

export const metadata: Metadata = {
	title: "Facturation électronique - Administration",
	description: "État facturation, e-reporting DGFiP et batches transmission",
};

export default async function FacturationAdminPage() {
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

			<PageHeader
				variant="compact"
				title="Facturation électronique"
				description="État des factures émises + e-reporting DGFiP (Art. 286 / 289-I / L102 B)"
			/>

			<InvoicingOverviewSection overview={overview} />
		</div>
	);
}
