"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useProcessRefund } from "@/modules/refund/hooks/admin/use-process-refund";

interface ProcessRefundWrapperProps {
	className?: string;
	children?: React.ReactNode;
	refundId: string;
}

export function ProcessRefundWrapper({
	className,
	children,
	refundId,
}: ProcessRefundWrapperProps) {
	const { action } = useProcessRefund();
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
