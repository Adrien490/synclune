"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useMarkAsReturned } from "@/modules/orders/hooks/use-mark-as-returned";

interface MarkAsReturnedWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
	reason?: string;
}

export function MarkAsReturnedWrapper({
	className,
	children,
	orderId,
	reason,
}: MarkAsReturnedWrapperProps) {
	const { action } = useMarkAsReturned();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("id", orderId);
		if (reason) {
			formData.append("reason", reason);
		}
		startTransition(() => {
			action(formData);
		});
	};

	return (
		<span className={cn(className)} onClick={handleClick}>
			{children}
		</span>
	);
}
