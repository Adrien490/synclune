"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshUsers } from "@/modules/users/hooks/use-refresh-users";

interface RefreshUsersButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshUsersButton({
	className,
	variant = "outline",
}: RefreshUsersButtonProps) {
	const { refresh, isPending } = useRefreshUsers();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir utilisateurs"
			className={className}
			variant={variant}
		/>
	);
}
