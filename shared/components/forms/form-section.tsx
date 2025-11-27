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
				"border-border/60 bg-card/50 backdrop-blur-sm transition-shadow hover:shadow-sm",
				className
			)}
		>
			<CardHeader className="px-6 pt-5 pb-3">
				<div className="flex items-center gap-3">
					{icon && (
						<div className="shrink-0 text-primary size-5">
							{icon}
						</div>
					)}
					<CardTitle className="text-lg font-display">
						{title}
					</CardTitle>
				</div>
				{description && (
					<CardDescription className="mt-1.5">
						{description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="px-6 pb-6 space-y-4">
				{children}
			</CardContent>
		</Card>
	);
}
