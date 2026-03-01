import * as React from "react";

import { cn } from "@/shared/utils/cn";

interface TextareaProps extends React.ComponentProps<"textarea"> {
	/** Active le redimensionnement automatique selon le contenu (field-sizing: content) */
	autoGrow?: boolean;
}

const supportsFieldSizing = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function Textarea({ className, autoGrow = false, ref, ...props }: TextareaProps) {
	const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

	// JS fallback for Safari/Firefox which don't support field-sizing: content
	React.useEffect(() => {
		if (!autoGrow || supportsFieldSizing) return;
		const textarea = internalRef.current;
		if (!textarea) return;

		const resize = () => {
			textarea.style.height = "auto";
			textarea.style.height = `${textarea.scrollHeight}px`;
		};

		resize();
		textarea.addEventListener("input", resize);
		return () => textarea.removeEventListener("input", resize);
	}, [autoGrow]);

	return (
		<textarea
			ref={(node) => {
				internalRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			data-slot="textarea"
			className={cn(
				"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex min-h-30 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-25 md:text-sm",
				// field-sizing: content for auto-grow (Chrome 123+, not supported in Safari/Firefox — JS fallback above)
				autoGrow && "[field-sizing:content]",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
