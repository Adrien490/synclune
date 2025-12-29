"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshNewsletter } from "@/modules/newsletter/hooks/use-refresh-newsletter";

interface RefreshNewsletterButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshNewsletterButton({
	className,
	variant = "outline",
}: RefreshNewsletterButtonProps) {
	const { refresh, isPending } = useRefreshNewsletter();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir newsletter"
			className={className}
			variant={variant}
		/>
	);
}
