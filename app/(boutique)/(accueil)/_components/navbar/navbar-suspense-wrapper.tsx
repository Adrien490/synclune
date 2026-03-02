import { ErrorBoundary } from "@/shared/components/error-boundary";
import { Suspense } from "react";
import { Navbar } from "./navbar";
import { NavbarSkeleton } from "./navbar-skeleton";

export function NavbarSuspenseWrapper() {
	return (
		<ErrorBoundary fallback={<NavbarSkeleton />}>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
		</ErrorBoundary>
	);
}
