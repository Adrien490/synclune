import { PageHeader } from "@/shared/components/page-header";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Matériaux - Administration",
	description: "Gérer les matériaux",
};

export default function MaterialsAdminPage() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Matériaux"
				description="Gérez les matériaux de vos produits"
			/>

			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">Page en construction</p>
			</div>
		</>
	);
}
