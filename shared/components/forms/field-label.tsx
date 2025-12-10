import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { HelpCircle } from "lucide-react";

interface FieldLabelProps {
	htmlFor?: string;
	children: React.ReactNode;
	required?: boolean;
	optional?: boolean;
	tooltip?: React.ReactNode;
	className?: string;
}

export function FieldLabel({
	htmlFor,
	children,
	required = false,
	optional = false,
	tooltip,
	className,
}: FieldLabelProps) {
	return (
		<div className="flex items-center gap-2">
			<Label htmlFor={htmlFor} className={cn("text-sm font-medium", className)}>
				{children}
				{required && <span className="text-destructive ml-1">*</span>}
				{optional && !required && (
					<span className="text-muted-foreground text-xs ml-2 font-normal">
						(Optionnel)
					</span>
				)}
			</Label>
			{tooltip && (
				<TooltipProvider delayDuration={200}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-auto w-auto p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
								aria-label="Plus d'informations"
							>
								<HelpCircle className="h-3.5 w-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" className="max-w-xs">
							{tooltip}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
}
