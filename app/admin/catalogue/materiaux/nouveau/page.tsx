import { type Metadata } from "next";

import { CreateMaterialForm } from "@/modules/materials/components/admin/create-material-form";

export const metadata: Metadata = {
	title: "Nouveau matériau - Administration",
	description: "Créer un nouveau matériau",
};

export default function CreateMaterialPage() {
	return (
		<>
			<h1 className="mb-6 text-2xl font-semibold">Nouveau matériau</h1>
			<CreateMaterialForm className="max-w-lg" />
		</>
	);
}
