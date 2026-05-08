"use client";

import { ApproveRefundAlertDialog } from "@/modules/refunds/components/admin/approve-refund-alert-dialog";
import { CancelRefundAlertDialog } from "@/modules/refunds/components/admin/cancel-refund-alert-dialog";
import { ProcessRefundAlertDialog } from "@/modules/refunds/components/admin/process-refund-alert-dialog";
import { RejectRefundAlertDialog } from "@/modules/refunds/components/admin/reject-refund-alert-dialog";

export function RefundsAdminDialogs() {
	return (
		<>
			<ApproveRefundAlertDialog />
			<ProcessRefundAlertDialog />
			<RejectRefundAlertDialog />
			<CancelRefundAlertDialog />
		</>
	);
}
