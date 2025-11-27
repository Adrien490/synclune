"use client";

import { useActionState } from "react";
import { logout } from "@/modules/auth/actions/logout";

export function useLogout() {
	const [state, action, isPending] = useActionState(logout, null);

	return { state, action, isPending };
}
