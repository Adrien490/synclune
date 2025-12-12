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
		<Card className={cn("shadow-sm", className)}>
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
			<CardContent>
				<div className="space-y-4">{children}</div>
			</CardContent>
		</Card>
	);
}
