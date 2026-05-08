import { type Metadata } from "next";

import { CreateMaterialForm } from "@/modules/materials/components/admin/create-material-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouveau matériau - Administration",
	description: "Créer un nouveau matériau",
};

export default function CreateMaterialPage() {
	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/catalogue/materiaux" label="Retour aux matériaux" />
			<h1 className="hidden text-2xl font-semibold md:block">Nouveau matériau</h1>
			<CreateMaterialForm className="max-w-lg" />
		</div>
	);
}
