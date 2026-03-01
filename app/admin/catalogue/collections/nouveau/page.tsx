import { type Metadata } from "next";
import { CreateCollectionForm } from "@/modules/collections/components/admin/create-collection-form";

export const metadata: Metadata = {
	title: "Nouvelle collection - Administration",
	description: "Créer une nouvelle collection",
};

export default function CreateCollectionPage() {
	return (
		<>
			<h1 className="mb-6 text-2xl font-semibold">Nouvelle collection</h1>
			<CreateCollectionForm className="max-w-lg" />
		</>
	);
}
