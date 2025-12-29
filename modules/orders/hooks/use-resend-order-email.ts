"use client";

import { useActionState, useTransition } from "react";
import {
	resendOrderEmail,
	type ResendEmailType,
} from "@/modules/orders/actions/resend-order-email";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

export function useResendOrderEmail() {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				resendOrderEmail(
					formData.get("orderId") as string,
					formData.get("emailType") as ResendEmailType
				),
			createToastCallbacks({})
		),
		undefined
	);

	const resend = (orderId: string, emailType: ResendEmailType) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("orderId", orderId);
			formData.append("emailType", emailType);
			formAction(formData);
		});
	};

	return {
		resend,
		isPending: isPending || isActionPending,
	};
}
