import { type Metadata } from "next";

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouvelle couleur - Administration",
	description: "Créer une nouvelle couleur",
};

export default function CreateColorPage() {
	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/catalogue/couleurs" label="Retour aux couleurs" />
			<h1 className="hidden text-2xl font-semibold md:block">Nouvelle couleur</h1>
			<CreateColorForm className="max-w-2xl" />
		</div>
	);
}
