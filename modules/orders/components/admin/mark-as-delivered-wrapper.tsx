"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useMarkAsDelivered } from "@/modules/orders/hooks/admin/use-mark-as-delivered";

interface MarkAsDeliveredWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
}

export function MarkAsDeliveredWrapper({
	className,
	children,
	orderId,
}: MarkAsDeliveredWrapperProps) {
	const { action } = useMarkAsDelivered();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("id", orderId);
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
