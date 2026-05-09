"use client";

import Link, { type LinkProps } from "next/link";
import { type ComponentProps } from "react";
import { useCartClose } from "../contexts/cart-close-context";

type CartCloseLinkProps = LinkProps &
	Omit<ComponentProps<"a">, keyof LinkProps> & {
		children: React.ReactNode;
	};

export function CartCloseLink({ onClick, children, ...props }: CartCloseLinkProps) {
	const close = useCartClose();
	return (
		<Link
			{...props}
			onClick={(e) => {
				close?.();
				onClick?.(e);
			}}
		>
			{children}
		</Link>
	);
}
