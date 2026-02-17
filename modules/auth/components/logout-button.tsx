"use client";

import { cn } from "@/shared/utils/cn";
import { useLogout } from "../hooks/use-logout";

interface LogoutButtonProps {
	className?: string;
	children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
	const { action, isPending, isLoggedOut } = useLogout();

	return (
		<button
			type="button"
			className={cn(className)}
			data-pending={isPending || isLoggedOut ? "" : undefined}
			disabled={isPending || isLoggedOut}
			aria-busy={isPending}
			aria-label="Se déconnecter"
			onClick={() => {
				if (isPending || isLoggedOut) return;
				action(new FormData());
			}}
		>
			{children}
		</button>
	);
}
