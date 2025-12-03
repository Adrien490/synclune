import { Metadata } from "next";
import { CreateCollectionForm } from "@/modules/collections/components/admin/create-collection-form";

export const metadata: Metadata = {
	title: "Nouvelle collection - Administration",
	description: "Créer une nouvelle collection",
};

export default function CreateCollectionPage() {
	return (
		<>
			<h1 className="text-2xl font-semibold mb-6">Nouvelle collection</h1>
			<CreateCollectionForm className="max-w-lg" />
		</>
	);
}
