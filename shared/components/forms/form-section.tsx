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
		<Card className={cn("shadow-sm", className)}>
			{!hideHeader && (
				<CardHeader className="border-b">
					<div className="flex items-center gap-2">
						{icon && (
							<div className="shrink-0 text-primary size-5">{icon}</div>
						)}
						<CardTitle className="text-base md:text-lg font-display">
							{title}
						</CardTitle>
					</div>
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
			)}
			<CardContent className={cn(hideHeader && "pt-0")}>
				<div className="space-y-4">{children}</div>
			</CardContent>
		</Card>
	);
}
