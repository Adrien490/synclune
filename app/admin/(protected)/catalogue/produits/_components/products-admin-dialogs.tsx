"use client";

import { ChangeProductStatusAlertDialog } from "@/modules/products/components/admin/change-product-status-alert-dialog";
import { DeleteProductAlertDialog } from "@/modules/products/components/admin/delete-product-alert-dialog";
import { DuplicateProductAlertDialog } from "@/modules/products/components/admin/duplicate-product-alert-dialog";
import { ManageCollectionsDialog } from "@/modules/products/components/admin/manage-collections-dialog";

export function ProductsAdminDialogs() {
	return (
		<>
			<DeleteProductAlertDialog />
			<ChangeProductStatusAlertDialog />
			<DuplicateProductAlertDialog />
			<ManageCollectionsDialog />
		</>
	);
}
