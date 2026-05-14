"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface CheckoutBackLinkProps {
	href?: string;
	label?: string;
}

export function CheckoutBackLink({
	href = "/produits",
	label = "Boutique",
}: CheckoutBackLinkProps) {
	const router = useRouter();

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		triggerHaptic("selection");
		withViewTransition(() => router.push(href));
	}

	return (
		<Link
			href={href}
			aria-label={label}
			onClick={handleClick}
			className="group text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg p-2 text-sm motion-safe:transition-[transform,color,background-color] motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:px-3"
		>
			<ArrowLeft
				className="size-4 motion-safe:transition-transform motion-safe:group-hover:-translate-x-0.5"
				aria-hidden="true"
			/>
			<span className="hidden sm:inline">{label}</span>
		</Link>
	);
}
