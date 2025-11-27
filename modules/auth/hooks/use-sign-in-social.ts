"use client";

import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { signInSocial } from "@/modules/auth/actions/sign-in-social";

export function useSignInSocial() {
	const [state, action, isPending] = useActionState(signInSocial, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	return { state, action, isPending };
}
