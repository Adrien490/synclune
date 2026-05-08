"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface AdminDetailBackLinkProps {
	href: string;
	label: string;
}

export function AdminDetailBackLink({ href, label }: AdminDetailBackLinkProps) {
	const router = useRouter();
	const haptic = useHaptic();

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		event.preventDefault();
		haptic("light");
		withViewTransition(() => router.push(href));
	};

	return (
		<a
			href={href}
			onClick={handleClick}
			className="text-muted-foreground hover:text-foreground active:text-foreground inline-flex items-center gap-1 text-sm transition-all duration-150 active:scale-[0.98] md:hidden"
		>
			<ChevronLeft className="size-4" aria-hidden="true" />
			{label}
		</a>
	);
}
