"use client";

import { CopyIcon } from "@phosphor-icons/react/ssr";
import { toast } from "@/shared/utils/toast";
import { Button } from "@/shared/components/ui/button";

interface CopyButtonProps {
	text: string;
	label: string;
	className?: string;
	size?: "default" | "sm" | "icon";
}

export function CopyButton({ text, label, className, size = "sm" }: CopyButtonProps) {
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copié`);
		} catch {
			toast.error("Impossible de copier dans le presse-papiers");
		}
	};

	return (
		<Button
			variant="ghost"
			size={size}
			className={className}
			aria-label={`Copier ${label.toLowerCase()}`}
			onClick={handleCopy}
		>
			<CopyIcon className="size-4" aria-hidden="true" />
		</Button>
	);
}
