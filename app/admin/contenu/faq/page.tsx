import dynamic from "next/dynamic";
import { Suspense } from "react";
import { type Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FaqList } from "@/modules/content/components/admin/faq-list";
import { getAdminFaqItems } from "@/modules/content/data/get-admin-faq-items";

import { CreateFaqButton } from "./create-faq-button";

const FaqFormDialog = dynamic(
	() =>
		import("@/modules/content/components/admin/faq-form-dialog").then((mod) => mod.FaqFormDialog),
	{ ssr: false },
);

const DeleteFaqAlertDialog = dynamic(
	() =>
		import("@/modules/content/components/admin/delete-faq-alert-dialog").then(
			(mod) => mod.DeleteFaqAlertDialog,
		),
	{ ssr: false },
);

export const metadata: Metadata = {
	title: "FAQ - Administration",
	description: "Gérer les questions fréquentes",
};

export default async function FaqAdminPage() {
	await connection();

	const faqItemsPromise = getAdminFaqItems();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Questions fréquentes"
				description="Gérez les questions affichées sur la homepage. Glissez-déposez pour réordonner."
				actions={<CreateFaqButton />}
				className="hidden md:block"
			/>

			<Suspense
				fallback={
					<div className="space-y-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				}
			>
				<FaqList faqItemsPromise={faqItemsPromise} />
			</Suspense>

			<FaqFormDialog />
			<DeleteFaqAlertDialog />
		</>
	);
}
