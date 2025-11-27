"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useDeleteOrder } from "@/modules/orders/hooks/admin/use-delete-order";

interface DeleteOrderWrapperProps {
	className?: string;
	children?: React.ReactNode;
	orderId: string;
}

export function DeleteOrderWrapper({
	className,
	children,
	orderId,
}: DeleteOrderWrapperProps) {
	const { action } = useDeleteOrder();
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
