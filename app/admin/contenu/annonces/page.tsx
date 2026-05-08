import { type Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";

import { AnnouncementForm } from "@/modules/store-settings/components/admin/announcement-form";
import { getStoreSettings } from "@/modules/store-settings/data/get-store-settings";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Annonces - Administration",
	description: "Gérer la barre d'annonce promotionnelle",
};

export default async function AnnouncementsAdminPage() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Annonces"
				description="Configurez le bandeau d'annonce affiché au-dessus du navbar."
				actions={
					<Button variant="outline" size="sm" asChild>
						<Link href="/" target="_blank">
							<ExternalLink className="size-4" />
							Voir sur la boutique
						</Link>
					</Button>
				}
			/>
			<Suspense fallback={<Skeleton className="h-96 w-full" />}>
				<AnnouncementFormSection />
			</Suspense>
		</>
	);
}

async function AnnouncementFormSection() {
	const settings = await getStoreSettings();

	return (
		<AnnouncementForm
			announcementMessage={settings?.announcementMessage ?? null}
			announcementLink={settings?.announcementLink ?? null}
			announcementStartsAt={settings?.announcementStartsAt ?? null}
			announcementEndsAt={settings?.announcementEndsAt ?? null}
			announcementIsActive={settings?.announcementIsActive ?? false}
		/>
	);
}
