"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useApproveRefund } from "@/modules/refunds/hooks/use-approve-refund";

interface ApproveRefundWrapperProps {
	className?: string;
	children?: React.ReactNode;
	refundId: string;
}

export function ApproveRefundWrapper({
	className,
	children,
	refundId,
}: ApproveRefundWrapperProps) {
	const { action } = useApproveRefund();
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
