import { type Metadata } from "next";

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";

export const metadata: Metadata = {
	title: "Nouvelle couleur - Administration",
	description: "Créer une nouvelle couleur",
};

export default function CreateColorPage() {
	return (
		<>
			<h1 className="mb-6 hidden text-2xl font-semibold md:block">Nouvelle couleur</h1>
			<CreateColorForm className="max-w-2xl" />
		</>
	);
}
