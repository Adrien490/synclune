import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";

interface FormFooterProps {
	isPending?: boolean;
	cancelHref?: string;
	submitLabel: string;
	disabled?: boolean;
	cancelLabel?: string;
	showRequiredHint?: boolean;
	className?: string;
}

/**
 * Pied de formulaire modernisé avec boutons d'action
 * Design épuré sans Card, avec effet backdrop subtil
 */
export function FormFooter({
	disabled = false,
	isPending = false,
	cancelHref,
	submitLabel,
	cancelLabel = "Annuler",
	showRequiredHint = true,
	className = "",
}: FormFooterProps) {
	return (
		<div
			className={cn(
				"sticky bottom-0 -mx-8 py-4 px-8 z-10 bg-card backdrop-blur-sm mt-10",
				"flex flex-col sm:flex-row items-center justify-between gap-4 transition-all",
				className
			)}
		>
			{showRequiredHint && (
				<p className="text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
					Les champs marqués d&apos;un{" "}
					<span className="text-destructive font-medium">*</span> sont
					obligatoires
				</p>
			)}

			<div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2 justify-end">
				{cancelHref && (
					<Button
						type="button"
						variant="outline"
						className="w-full sm:w-auto border-border/70 hover:bg-background hover:text-foreground hover:border-border"
						size="default"
						asChild
					>
						<Link href={cancelHref}>{cancelLabel}</Link>
					</Button>
				)}

				<Button
					type="submit"
					disabled={disabled || isPending}
					className="w-full sm:w-auto shadow-sm transition-all"
					size="default"
				>
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}
