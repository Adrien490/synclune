"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useApproveRefund } from "@/modules/refund/hooks/admin/use-approve-refund";

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
		<span className={cn(className)} onClick={handleClick}>
			{children}
		</span>
	);
}
