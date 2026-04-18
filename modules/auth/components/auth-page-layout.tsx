import { LogoAnimated } from "@/shared/components/logo-animated";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthFadeIn } from "./auth-fade-in";

interface AuthPageLayoutProps {
	children: ReactNode;
	backHref: string;
	backLabel: string;
	title: string;
	description?: string;
	icon?: ReactNode;
}

export function AuthPageLayout({
	children,
	backHref,
	backLabel,
	title,
	description,
	icon,
}: AuthPageLayoutProps) {
	return (
		<div className="relative">
			{/* Back link */}
			<div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] z-20 sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:left-[max(1.5rem,env(safe-area-inset-left))]">
				<Link
					href={backHref}
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">{backLabel}</span>
				</Link>
			</div>

			{/* Logo */}
			<div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:right-[max(1.5rem,env(safe-area-inset-right))]">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Main content */}
			<div className="relative z-10 flex min-h-screen justify-center pt-[calc(4rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:pt-[calc(5rem+env(safe-area-inset-top))] sm:pb-[max(3rem,env(safe-area-inset-bottom))]">
				<div
					className="my-auto w-full max-w-md space-y-8"
					style={{ viewTransitionName: "auth-card" }}
				>
					{/* Header */}
					<AuthFadeIn>
						<div className="space-y-7 text-center">
							{icon && <div className="flex justify-center">{icon}</div>}
							<div className="space-y-3">
								<h1
									className={cn(
										"text-foreground text-2xl font-normal sm:text-3xl lg:text-4xl",
										"font-display",
									)}
									style={{ viewTransitionName: "auth-title" }}
								>
									{title}
								</h1>
								{description && <p className="text-muted-foreground">{description}</p>}
							</div>
						</div>
					</AuthFadeIn>

					{/* Content */}
					<AuthFadeIn delay={0.1}>{children}</AuthFadeIn>
				</div>
			</div>
		</div>
	);
}
