import { type Metadata } from "next";
import { CreateCollectionForm } from "@/modules/collections/components/admin/create-collection-form";

export const metadata: Metadata = {
	title: "Nouvelle collection - Administration",
	description: "Créer une nouvelle collection",
};

export default function CreateCollectionPage() {
	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Nouvelle collection</h1>
			<CreateCollectionForm className="max-w-lg" />
		</div>
	);
}
