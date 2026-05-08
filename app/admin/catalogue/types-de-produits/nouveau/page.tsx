import { type Metadata } from "next";

import { CreateProductTypeForm } from "@/modules/product-types/components/admin/create-product-type-form";

export const metadata: Metadata = {
	title: "Nouveau type de produit - Administration",
	description: "Créer un nouveau type de produit",
};

export default function CreateProductTypePage() {
	return (
		<>
			<h1 className="mb-6 hidden text-2xl font-semibold md:block">Nouveau type de produit</h1>
			<CreateProductTypeForm className="max-w-md" />
		</>
	);
}
