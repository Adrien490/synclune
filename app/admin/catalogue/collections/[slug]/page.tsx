import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { CollectionDetailPage } from "@/modules/collections/components/admin/collection-detail";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

const SetFeaturedProductAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/set-featured-product-alert-dialog").then(
		(mod) => mod.SetFeaturedProductAlertDialog,
	),
);

const CollectionFormDialog = dynamic(() =>
	import("@/modules/collections/components/admin/collection-form-dialog").then(
		(mod) => mod.CollectionFormDialog,
	),
);

const CollectionsAdminDialogs = dynamic(() =>
	import("../_components/collections-admin-dialogs").then((mod) => mod.CollectionsAdminDialogs),
);

type CollectionDetailPageProps = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CollectionDetailPageProps): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	if (!collection) {
		return { title: "Collection introuvable - Administration" };
	}

	return {
		title: `${collection.name} - Administration`,
		description: `Détails de la collection ${collection.name}`,
	};
}

export default async function AdminCollectionDetailPage({ params }: CollectionDetailPageProps) {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	if (!collection) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<AdminDetailBackLink href="/admin/catalogue/collections" label="Retour aux collections" />

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/collections">Collections</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{collection.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<CollectionDetailPage collection={collection} />

			<SetFeaturedProductAlertDialog />
			<CollectionFormDialog />
			<CollectionsAdminDialogs />
		</div>
	);
}
