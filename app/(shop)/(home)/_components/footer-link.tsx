import Link from "next/link";
import type { ReactNode } from "react";

const BASE_TACTILE_CLASSES =
	"focus-ring touch-manipulation motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.98]";

type FooterLinkBaseProps = {
	href: string;
	children: ReactNode;
	className?: string;
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
	external,
	target,
	rel,
	...rest
}: FooterLinkProps) {
	const composedClassName = className
		? `${className} ${BASE_TACTILE_CLASSES}`
		: BASE_TACTILE_CLASSES;

	if (external) {
		return (
			<a href={href} target={target} rel={rel} className={composedClassName} {...rest}>
				{children}
			</a>
		);
	}

	return (
		<Link href={href} className={composedClassName} {...rest}>
			{children}
		</Link>
	);
}
