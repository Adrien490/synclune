"use client";

import { cn } from "@/shared/utils/cn";
import { useTransition } from "react";
import { useDeleteProduct } from "@/modules/products/hooks/admin/use-delete-product";

interface DeleteProductWrapperProps {
	className?: string;
	children?: React.ReactNode;
	productId: string;
}

export function DeleteProductWrapper({
	className,
	children,
	productId,
}: DeleteProductWrapperProps) {
	const { action } = useDeleteProduct();
	const [, startTransition] = useTransition();

	const handleClick = () => {
		const formData = new FormData();
		formData.append("productId", productId);
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
