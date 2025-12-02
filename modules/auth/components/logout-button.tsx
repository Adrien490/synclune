"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useLogout } from "../hooks/use-logout";

interface LogoutButtonProps {
	className?: string;
	children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
	const { action } = useLogout();
	const [, startTransition] = useTransition();

	return (
		<span
			className={cn(className)}
			onClick={() => {
				startTransition(() => {
					action(new FormData());
				});
			}}
		>
			{children}
		</span>
	);
}
