"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";

interface CopyButtonProps {
	text: string;
	label: string;
	className?: string;
	size?: "default" | "sm" | "icon";
}

export function CopyButton({ text, label, className, size = "sm" }: CopyButtonProps) {
	const handleCopy = () => {
		navigator.clipboard.writeText(text);
		toast.success(`${label} copié`);
	};

	return (
		<Button
			variant="ghost"
			size={size}
			className={className}
			aria-label={`Copier ${label.toLowerCase()}`}
			onClick={handleCopy}
		>
			<Copy className="h-4 w-4" aria-hidden="true" />
		</Button>
	);
}
