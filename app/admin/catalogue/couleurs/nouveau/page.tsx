import { type Metadata } from "next";

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";

export const metadata: Metadata = {
	title: "Nouvelle couleur - Administration",
	description: "Créer une nouvelle couleur",
};

export default function CreateColorPage() {
	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Nouvelle couleur</h1>
			<CreateColorForm className="max-w-2xl" />
		</div>
	);
}
