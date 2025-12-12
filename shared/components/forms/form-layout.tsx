import { cn } from "@/shared/utils/cn";

interface FormLayoutProps {
	children: React.ReactNode;
	className?: string;
}

export function FormLayout({ children, className }: FormLayoutProps) {
	return (
		<div className={cn("grid grid-cols-1 gap-4 md:gap-6", className)}>
			{children}
		</div>
	);
}
