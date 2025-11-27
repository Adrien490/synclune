"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useMarkAsPaid } from "@/modules/orders/hooks/admin/use-mark-as-paid";

interface MarkAsPaidWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
}

export function MarkAsPaidWrapper({
	className,
	children,
	orderId,
}: MarkAsPaidWrapperProps) {
	const { action } = useMarkAsPaid();
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
