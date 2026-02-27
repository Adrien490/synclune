"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshUsers } from "@/modules/users/actions/refresh-users";

interface UseRefreshUsersOptions {
	onSuccess?: () => void;
}

export function useRefreshUsers(options?: UseRefreshUsersOptions) {
	return useRefreshAction(refreshUsers, {
		onSuccess: options?.onSuccess,
	});
}
