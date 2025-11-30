"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useRejectRefund } from "@/modules/refund/hooks/use-reject-refund";

interface RejectRefundWrapperProps {
	className?: string;
	children?: React.ReactNode;
	refundId: string;
	reason?: string;
}

export function RejectRefundWrapper({
	className,
	children,
	refundId,
	reason,
}: RejectRefundWrapperProps) {
	const { action } = useRejectRefund();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("id", refundId);
		if (reason) {
			formData.append("reason", reason);
		}
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
