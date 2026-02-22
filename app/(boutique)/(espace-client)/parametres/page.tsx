import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";
import {
	Skeleton,
	SkeletonGroup,
} from "@/shared/components/ui/skeleton";
import { Bell, Monitor, User } from "lucide-react";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getUserProviders } from "@/modules/auth/data/get-user-providers";
import { getSubscriptionStatus } from "@/modules/newsletter/data/get-subscription-status";
import { getUserSessions } from "@/modules/auth/data/get-user-sessions";
import { ProfileForm } from "@/modules/users/components/profile-form";
import { SecuritySection } from "@/modules/users/components/security-section";
import { GdprSection } from "@/modules/users/components/gdpr-section";
import { NewsletterSettingsCard } from "@/modules/newsletter/components/newsletter-settings-card";
import { ActiveSessionsCard } from "@/modules/auth/components/active-sessions-card";

export const metadata: Metadata = {
	title: "Paramètres",
};

export default async function SettingsPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const providers = await getUserProviders();

	return (
		<>
			<PageHeader title="Paramètres" variant="compact" />

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<section className="space-y-4">
						<div>
							<h2 className="text-base font-semibold flex items-center gap-2">
								<User className="size-4 text-muted-foreground" />
								Profil
							</h2>
							<p className="text-sm text-muted-foreground mt-0.5">
								Modifiez vos informations personnelles
							</p>
						</div>
						<div className="border-t border-border/60 pt-4">
							<ProfileForm user={user} />
						</div>
					</section>

					<SecuritySection
						emailVerified={user.emailVerified}
						providers={providers}
						email={user.email}
					/>

					<GdprSection />
				</div>

				<div className="space-y-6">
					<Suspense fallback={<NewsletterSkeleton />}>
						<NewsletterWrapper />
					</Suspense>

					<Suspense fallback={<SessionsSkeleton />}>
						<SessionsWrapper />
					</Suspense>
				</div>
			</div>
		</>
	);
}

async function NewsletterWrapper() {
	const status = await getSubscriptionStatus();
	return <NewsletterSettingsCard isSubscribed={status.isSubscribed} />;
}

async function SessionsWrapper() {
	const sessions = await getUserSessions();
	return <ActiveSessionsCard sessions={sessions} />;
}

function NewsletterSkeleton() {
	return (
		<SkeletonGroup label="Chargement des paramètres newsletter">
			<section className="space-y-4">
				<div>
					<div className="flex items-center gap-2">
						<Bell className="size-4 text-muted-foreground" />
						<Skeleton className="h-5 w-32" />
					</div>
					<Skeleton className="h-4 w-48 mt-0.5" />
				</div>
				<div className="border-t border-border/60 pt-4 space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-9 w-full" />
				</div>
			</section>
		</SkeletonGroup>
	);
}

function SessionsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des sessions actives">
			<section className="space-y-4">
				<div>
					<div className="flex items-center gap-2">
						<Monitor className="size-4 text-muted-foreground" />
						<Skeleton className="h-5 w-40" />
					</div>
					<Skeleton className="h-4 w-28 mt-0.5" />
				</div>
				<div className="border-t border-border/60 pt-4">
					<div className="divide-y divide-border/50">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
							>
								<Skeleton className="w-5 h-5" shape="circle" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</SkeletonGroup>
	);
}
