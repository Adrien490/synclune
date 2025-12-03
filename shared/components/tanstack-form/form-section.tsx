import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
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
		<Card
			className={cn(
				// Mobile: pas de card styling
				"border-0 bg-transparent shadow-none rounded-none",
				// Desktop: card styling complet
				"md:border md:border-l-4 md:border-l-primary md:border-border/60",
				"md:bg-card/50 md:backdrop-blur-sm",
				"md:rounded-xl md:shadow-none md:hover:shadow-sm",
				"md:transition-shadow",
				// Pas de padding vertical
				"py-0",
				className
			)}
		>
			{!hideHeader && (
				<CardHeader className="px-0 md:px-6 pt-0 md:pt-4 pb-2">
					<div className="flex items-center gap-2 md:gap-3">
						{icon && (
							<div className="shrink-0 text-primary size-5">
								{icon}
							</div>
						)}
						<CardTitle className="text-base md:text-xl font-display font-semibold">
							{title}
						</CardTitle>
					</div>
					{description && (
						<CardDescription className="mt-1 md:mt-1.5 text-sm text-muted-foreground/80">
							{description}
						</CardDescription>
					)}
				</CardHeader>
			)}
			<CardContent className={cn(
				"px-0 md:px-6 pb-0 md:pb-5 space-y-4",
				hideHeader ? "pt-0" : "pt-2"
			)}>
				{children}
			</CardContent>
		</Card>
	);
}
