"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useCancelRefund } from "@/modules/refund/hooks/use-cancel-refund";

interface CancelRefundWrapperProps {
	className?: string;
	children?: React.ReactNode;
	refundId: string;
}

export function CancelRefundWrapper({
	className,
	children,
	refundId,
}: CancelRefundWrapperProps) {
	const { action } = useCancelRefund();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("id", refundId);
		startTransition(() => {
			action(formData);
		});
	};

	return (
		<button
			type="button"
			className={cn("appearance-none bg-transparent border-none p-0 m-0 text-inherit font-inherit cursor-pointer", className)}
			onClick={handleClick}
		>
			{children}
		</button>
	);
}
