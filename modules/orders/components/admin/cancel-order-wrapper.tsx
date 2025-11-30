"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useCancelOrder } from "@/modules/orders/hooks/use-cancel-order";

interface CancelOrderWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
}

export function CancelOrderWrapper({
	className,
	children,
	orderId,
}: CancelOrderWrapperProps) {
	const { action } = useCancelOrder();
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
