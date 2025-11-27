import { cn } from "@/shared/utils/cn";

interface FormLayoutProps {
	children: React.ReactNode;
	className?: string;
	/** Number of columns on desktop */
	cols?: 1 | 2 | 3 | 4;
}

const colsMap = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
};

/**
 * Simple grid layout for forms
 * Defaults to 1 column on mobile and 2 columns on desktop
 */
export function FormLayout({ children, className, cols = 2 }: FormLayoutProps) {
	return (
		<div className={cn("grid grid-cols-1 gap-6", colsMap[cols], className)}>
			{children}
		</div>
	);
}
