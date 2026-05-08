import { type Metadata } from "next";
import { CreateCollectionForm } from "@/modules/collections/components/admin/create-collection-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouvelle collection - Administration",
	description: "Créer une nouvelle collection",
};

export default function CreateCollectionPage() {
	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/catalogue/collections" label="Retour aux collections" />
			<h1 className="hidden text-2xl font-semibold md:block">Nouvelle collection</h1>
			<CreateCollectionForm className="max-w-lg" />
		</div>
	);
}
