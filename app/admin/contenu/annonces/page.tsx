import dynamic from "next/dynamic";
import { Suspense } from "react";
import { type Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AnnouncementDataTable } from "@/modules/announcements/components/admin/announcement-data-table";
import { getAnnouncements } from "@/modules/announcements/data/get-announcements";

import { CreateAnnouncementButton } from "./create-announcement-button";

const AnnouncementFormDialog = dynamic(() =>
	import("@/modules/announcements/components/admin/announcement-form-dialog").then(
		(mod) => mod.AnnouncementFormDialog,
	),
);

const DeleteAnnouncementAlertDialog = dynamic(() =>
	import("@/modules/announcements/components/admin/delete-announcement-alert-dialog").then(
		(mod) => mod.DeleteAnnouncementAlertDialog,
	),
);

export const metadata: Metadata = {
	title: "Annonces - Administration",
	description: "Gérer les annonces promotionnelles",
};

export default async function AnnouncementsAdminPage() {
	await connection();

	const announcementsPromise = getAnnouncements();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Annonces"
				description="Gérez les annonces promotionnelles affichées sur la boutique"
				actions={<CreateAnnouncementButton />}
				className="hidden md:block"
			/>

			<Suspense
				fallback={
					<div className="space-y-3">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				}
			>
				<AnnouncementDataTable announcementsPromise={announcementsPromise} />
			</Suspense>

			<AnnouncementFormDialog />
			<DeleteAnnouncementAlertDialog />
		</>
	);
}
