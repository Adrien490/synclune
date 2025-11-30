"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useProcessRefund } from "@/modules/refund/hooks/use-process-refund";

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
		<button
			type="button"
			className={cn("appearance-none bg-transparent border-none p-0 m-0 text-inherit font-inherit cursor-pointer", className)}
			onClick={handleClick}
		>
			{children}
		</button>
	);
}
