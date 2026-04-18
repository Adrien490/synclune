import dynamic from "next/dynamic";
import { Suspense } from "react";
import { type Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AnnouncementDataTable } from "@/modules/announcements/components/admin/announcement-data-table";
import { AnnouncementsMobileList } from "@/modules/announcements/components/admin/announcements-mobile-list";
import { AnnouncementsMobileListSkeleton } from "@/modules/announcements/components/admin/announcements-mobile-list-skeleton";
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

const AnnouncementItemDrawer = dynamic(() =>
	import("@/modules/announcements/components/admin/announcement-item-drawer").then(
		(mod) => mod.AnnouncementItemDrawer,
	),
);

const BulkDeleteAnnouncementsAlertDialog = dynamic(() =>
	import("@/modules/announcements/components/admin/bulk-delete-announcements-alert-dialog").then(
		(mod) => mod.BulkDeleteAnnouncementsAlertDialog,
	),
);

export const metadata: Metadata = {
	title: "Annonces - Administration",
	description: "Gérer les annonces promotionnelles",
};

export default async function AnnouncementsAdminPage() {
	const announcementsPromise = getAnnouncements();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Annonces"
				description="Gérez les annonces promotionnelles affichées sur la boutique"
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/" target="_blank">
								<ExternalLink className="h-4 w-4" />
								Voir sur la boutique
							</Link>
						</Button>
						<CreateAnnouncementButton />
					</div>
				}
				className="hidden md:block"
			/>

			{/* Mobile create button */}
			<div className="flex justify-end md:hidden">
				<CreateAnnouncementButton />
			</div>

			{/* Mobile list */}
			<Suspense fallback={<AnnouncementsMobileListSkeleton />}>
				<AnnouncementsMobileList announcementsPromise={announcementsPromise} />
			</Suspense>

			{/* Desktop table */}
			<Suspense
				fallback={
					<div className="hidden space-y-3 md:block">
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
			<BulkDeleteAnnouncementsAlertDialog />
			<AnnouncementItemDrawer />
		</>
	);
}
