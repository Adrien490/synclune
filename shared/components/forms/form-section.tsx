import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/utils/cn";

interface FormSectionProps {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	/** Masquer le header (utile pour wizard mobile où la barre de progression suffit) */
	hideHeader?: boolean;
}

export function FormSection({
	title,
	description,
	icon,
	children,
	className,
	hideHeader = false,
}: FormSectionProps) {
	return (
		<div className={cn("space-y-4", className)}>
			{!hideHeader && (
				<>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							{icon && (
								<div className="shrink-0 text-primary size-5">
									{icon}
								</div>
							)}
							<h3 className="text-base md:text-lg font-display font-semibold">
								{title}
							</h3>
						</div>
						{description && (
							<p className="text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
					<Separator />
				</>
			)}
			<div className="space-y-4">{children}</div>
		</div>
	);
}
