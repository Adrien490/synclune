"use client";

import { ArchiveCollectionAlertDialog } from "@/modules/collections/components/admin/archive-collection-alert-dialog";
import { ChangeCollectionStatusAlertDialog } from "@/modules/collections/components/admin/change-collection-status-alert-dialog";
import { DeleteCollectionAlertDialog } from "@/modules/collections/components/admin/delete-collection-alert-dialog";

export function CollectionsAdminDialogs() {
	return (
		<>
			<DeleteCollectionAlertDialog />
			<ArchiveCollectionAlertDialog />
			<ChangeCollectionStatusAlertDialog />
		</>
	);
}
