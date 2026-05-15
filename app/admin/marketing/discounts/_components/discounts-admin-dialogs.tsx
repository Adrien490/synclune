"use client";

import { DeleteDiscountAlertDialog } from "@/modules/discounts/components/admin/delete-discount-alert-dialog";
import { DiscountFormDialog } from "@/modules/discounts/components/admin/discount-form-dialog";
import { ToggleDiscountStatusAlertDialog } from "@/modules/discounts/components/admin/toggle-discount-status-alert-dialog";

export function DiscountsAdminDialogs() {
	return (
		<>
			<DiscountFormDialog />
			<DeleteDiscountAlertDialog />
			<ToggleDiscountStatusAlertDialog />
		</>
	);
}
