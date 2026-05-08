"use client";

import { DeleteDiscountAlertDialog } from "@/modules/discounts/components/admin/delete-discount-alert-dialog";
import { ToggleDiscountStatusAlertDialog } from "@/modules/discounts/components/admin/toggle-discount-status-alert-dialog";

export function DiscountsAdminDialogs() {
	return (
		<>
			<DeleteDiscountAlertDialog />
			<ToggleDiscountStatusAlertDialog />
		</>
	);
}
