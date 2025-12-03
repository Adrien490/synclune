import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { EditCollectionForm } from "@/modules/collections/components/admin/edit-collection-form";

interface EditCollectionPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({
	params,
}: EditCollectionPageProps): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });
	return {
		title: collection
			? `Modifier ${collection.name}`
			: "Collection introuvable",
	};
}

export default async function EditCollectionPage({
	params,
}: EditCollectionPageProps) {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	if (!collection) notFound();

	return (
		<>
			<h1 className="text-2xl font-semibold mb-6">{collection.name}</h1>
			<EditCollectionForm collection={collection} className="max-w-lg" />
		</>
	);
}
