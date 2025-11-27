"use client";

import { useActionState } from "react";
import { resendVerificationEmail } from "@/modules/auth/actions/resend-verification-email";

export function useResendVerificationEmail() {
	const [state, action, isPending] = useActionState(
		resendVerificationEmail,
		null
	);

	return {
		state,
		action,
		isPending,
	};
}
