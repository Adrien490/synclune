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
}

export function FormSection({
	title,
	description,
	icon,
	children,
	className,
}: FormSectionProps) {
	return (
		<Card
			className={cn(
				// Bordure gauche accent + bordures standard
				"border-l-4 border-l-primary border-border/60",
				// Background semi-transparent
				"bg-card/50 backdrop-blur-sm",
				// Hover et transition
				"transition-shadow hover:shadow-sm",
				// Supprimer le padding vertical de la Card
				"py-0",
				className
			)}
		>
			<CardHeader className="px-6 pt-4 pb-2">
				<div className="flex items-center gap-3">
					{icon && (
						<div className="shrink-0 text-primary size-5">
							{icon}
						</div>
					)}
					<CardTitle className="text-xl font-display font-semibold">
						{title}
					</CardTitle>
				</div>
				{description && (
					<CardDescription className="mt-1.5 text-muted-foreground/80">
						{description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="px-6 pt-2 pb-5 space-y-4">
				{children}
			</CardContent>
		</Card>
	);
}
