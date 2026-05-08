import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { EditCollectionForm } from "@/modules/collections/components/admin/edit-collection-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

interface EditCollectionPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditCollectionPageProps): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });
	return {
		title: collection ? `Modifier ${collection.name}` : "Collection introuvable",
	};
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	if (!collection) notFound();

	return (
		<div className="space-y-4">
			<AdminDetailBackLink
				href={`/admin/catalogue/collections/${slug}`}
				label="Retour à la collection"
			/>
			<h1 className="hidden text-2xl font-semibold md:block">{collection.name}</h1>
			<EditCollectionForm collection={collection} className="max-w-lg" />
		</div>
	);
}
