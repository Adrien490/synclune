import { type Metadata } from "next";

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Nouvelle couleur - Administration",
	description: "Créer une nouvelle couleur",
};

export default async function CreateColorPage() {
	await assertAdminPage();

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Nouvelle couleur</h1>
			<CreateColorForm className="max-w-2xl" />
		</div>
	);
}
