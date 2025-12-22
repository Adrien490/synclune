import { cn } from "@/shared/utils/cn";

interface FormLayoutProps {
	children: React.ReactNode;
	className?: string;
}

export function FormLayout({ children, className }: FormLayoutProps) {
	return (
		<div className={cn("space-y-4 md:space-y-6", className)}>{children}</div>
	);
}
