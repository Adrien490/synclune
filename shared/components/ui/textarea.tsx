import * as React from "react";

import { cn } from "@/shared/utils/cn";

interface TextareaProps extends React.ComponentProps<"textarea"> {
	/** Active le redimensionnement automatique selon le contenu (field-sizing: content) */
	autoGrow?: boolean;
}

function Textarea({ className, autoGrow = false, ...props }: TextareaProps) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-[120px] sm:min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				// field-sizing: content pour redimensionnement automatique (Tailwind 4)
				autoGrow && "[field-sizing:content]",
				className
			)}
			{...props}
		/>
	);
}

export { Textarea };
