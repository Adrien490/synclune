"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useDeleteColor } from "@/modules/colors/hooks/admin/use-delete-color";

interface DeleteColorButtonProps {
	className?: string;
	children?: React.ReactNode;
	colorId: string;
}

export function DeleteColorButton({
	className,
	children,
	colorId,
}: DeleteColorButtonProps) {
	const { action } = useDeleteColor();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("id", colorId);
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
