"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useMarkAsProcessing } from "@/modules/orders/hooks/use-mark-as-processing";

interface MarkAsProcessingWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
}

export function MarkAsProcessingWrapper({
	className,
	children,
	orderId,
}: MarkAsProcessingWrapperProps) {
	const { action } = useMarkAsProcessing();
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
