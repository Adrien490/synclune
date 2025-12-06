"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resendOrderEmail, type ResendEmailType } from "@/modules/orders/actions/resend-order-email";
import { ActionStatus } from "@/shared/types/server-action";

export function useResendOrderEmail() {
	const [isPending, startTransition] = useTransition();

	const resend = (orderId: string, emailType: ResendEmailType) => {
		startTransition(async () => {
			const result = await resendOrderEmail(orderId, emailType);

			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
			} else {
				toast.error(result.message);
			}
		});
	};

	return {
		resend,
		isPending,
	};
}
