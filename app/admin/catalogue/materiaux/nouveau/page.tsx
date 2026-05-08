import { type Metadata } from "next";

import { CreateMaterialForm } from "@/modules/materials/components/admin/create-material-form";

export const metadata: Metadata = {
	title: "Nouveau matériau - Administration",
	description: "Créer un nouveau matériau",
};

export default function CreateMaterialPage() {
	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Nouveau matériau</h1>
			<CreateMaterialForm className="max-w-lg" />
		</div>
	);
}
