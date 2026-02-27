import { cn } from "@/shared/utils/cn";
import { Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<span role="status" aria-label="Chargement">
			<Loader2Icon aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
		</span>
	);
}

export { Spinner };
