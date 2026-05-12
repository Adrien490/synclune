"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";

const BASE_TACTILE_CLASSES =
	"touch-manipulation motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.98]";

type FooterLinkBaseProps = {
	href: string;
	children: ReactNode;
	className?: string;
	haptic?: HapticPattern;
	"aria-label"?: string;
};

type FooterLinkProps = FooterLinkBaseProps &
	(
		| { external?: false; target?: never; rel?: never }
		| { external: true; target?: string; rel?: string }
	);

export function FooterLink({
	href,
	children,
	className,
	haptic = "selection",
	external,
	target,
	rel,
	...rest
}: FooterLinkProps) {
	const triggerHaptic = useHaptic();
	const handleClick = () => {
		triggerHaptic(haptic);
	};

	const composedClassName = className
		? `${className} ${BASE_TACTILE_CLASSES}`
		: BASE_TACTILE_CLASSES;

	if (external) {
		return (
			<a
				href={href}
				target={target}
				rel={rel}
				className={composedClassName}
				onClick={handleClick}
				{...rest}
			>
				{children}
			</a>
		);
	}

	return (
		<Link href={href} className={composedClassName} onClick={handleClick} {...rest}>
			{children}
		</Link>
	);
}
