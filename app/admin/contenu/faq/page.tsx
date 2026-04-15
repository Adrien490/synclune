import dynamic from "next/dynamic";
import { Suspense } from "react";
import { type Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FaqList } from "@/modules/faq/components/admin/faq-list";
import { getAdminFaqItems } from "@/modules/faq/data/get-admin-faq-items";

import { CreateFaqButton } from "./create-faq-button";

const FaqFormDialog = dynamic(() =>
	import("@/modules/faq/components/admin/faq-form-dialog").then((mod) => mod.FaqFormDialog),
);

const DeleteFaqAlertDialog = dynamic(() =>
	import("@/modules/faq/components/admin/delete-faq-alert-dialog").then(
		(mod) => mod.DeleteFaqAlertDialog,
	),
);

export const metadata: Metadata = {
	title: "FAQ - Administration",
	description: "Gérer les questions fréquentes",
};

export default async function FaqAdminPage() {
	const faqItemsPromise = getAdminFaqItems();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Questions fréquentes"
				description="Gérez les questions affichées sur la homepage. Glissez-déposez pour réordonner."
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/#faq" target="_blank">
								<ExternalLink className="h-4 w-4" />
								Voir sur la boutique
							</Link>
						</Button>
						<CreateFaqButton />
					</div>
				}
				className="hidden md:block"
			/>

			{/* Mobile create button */}
			<div className="flex justify-end md:hidden">
				<CreateFaqButton />
			</div>

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
