import { type Metadata } from "next";

import { CreateProductTypeForm } from "@/modules/product-types/components/admin/create-product-type-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouveau type de produit - Administration",
	description: "Créer un nouveau type de produit",
};

export default function CreateProductTypePage() {
	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/catalogue/types-de-produits" label="Retour aux types" />
			<h1 className="hidden text-2xl font-semibold md:block">Nouveau type de produit</h1>
			<CreateProductTypeForm className="max-w-md" />
		</div>
	);
}
