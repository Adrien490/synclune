"use client";

import { CancelOrderAlertDialog } from "@/modules/orders/components/admin/cancel-order-alert-dialog";
import { DeleteOrderAlertDialog } from "@/modules/orders/components/admin/delete-order-alert-dialog";
import { MarkAsDeliveredAlertDialog } from "@/modules/orders/components/admin/mark-as-delivered-alert-dialog";
import { MarkAsPaidAlertDialog } from "@/modules/orders/components/admin/mark-as-paid-alert-dialog";
import { MarkAsProcessingAlertDialog } from "@/modules/orders/components/admin/mark-as-processing-alert-dialog";
import { MarkAsReturnedAlertDialog } from "@/modules/orders/components/admin/mark-as-returned-alert-dialog";
import { MarkAsShippedDialog } from "@/modules/orders/components/admin/mark-as-shipped-dialog";
import { OrderNotesDialog } from "@/modules/orders/components/admin/order-notes-dialog";
import { RevertToProcessingDialog } from "@/modules/orders/components/admin/revert-to-processing-dialog";

export function OrdersAdminDialogs() {
	return (
		<>
			<CancelOrderAlertDialog />
			<DeleteOrderAlertDialog />
			<MarkAsPaidAlertDialog />
			<MarkAsShippedDialog />
			<MarkAsDeliveredAlertDialog />
			<MarkAsProcessingAlertDialog />
			<RevertToProcessingDialog />
			<MarkAsReturnedAlertDialog />
			<OrderNotesDialog />
		</>
	);
}
