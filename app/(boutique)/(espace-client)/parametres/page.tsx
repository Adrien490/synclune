import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getUserProviders } from "@/modules/auth/data/get-user-providers";
import { getSubscriptionStatus } from "@/modules/newsletter/data/get-subscription-status";
import { getUserSessions } from "@/modules/auth/data/get-user-sessions";
import { ProfileForm } from "@/modules/users/components/profile-form";
import { SecuritySection } from "@/modules/users/components/security-section";
import { GdprSection } from "@/modules/users/components/gdpr-section";
import { NewsletterSettingsCard } from "@/modules/newsletter/components/newsletter-settings-card";
import { ActiveSessionsCard } from "@/modules/auth/components/active-sessions-card";
import { LogoutCard } from "@/modules/auth/components/logout-card";
export const metadata: Metadata = {
	title: "Paramètres",
};

export default async function SettingsPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const daysRemaining = computeDaysRemaining(user.deletionRequestedAt);

	return (
		<>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<section className="space-y-4" aria-labelledby="profile-heading">
						<div>
							<h2 id="profile-heading" className="text-base font-semibold">
								Profil
							</h2>
							<p className="text-muted-foreground mt-0.5 text-sm">
								Modifiez vos informations personnelles
							</p>
						</div>
						<div className="border-border/60 border-t pt-4">
							<ProfileForm user={user} />
						</div>
					</section>

					<Suspense fallback={<SecuritySkeleton />}>
						<SecuritySectionWrapper emailVerified={user.emailVerified} email={user.email} />
					</Suspense>

					<GdprSection accountStatus={user.accountStatus} daysRemaining={daysRemaining} />
				</div>

				<div className="space-y-6">
					<Suspense fallback={<NewsletterSkeleton />}>
						<NewsletterWrapper />
					</Suspense>

					<Suspense fallback={<SessionsSkeleton />}>
						<SessionsWrapper />
					</Suspense>

					<LogoutCard />
				</div>
			</div>
		</>
	);
}

async function SecuritySectionWrapper({
	emailVerified,
	email,
}: {
	emailVerified: boolean;
	email: string;
}) {
	const providers = await getUserProviders();
	return <SecuritySection emailVerified={emailVerified} providers={providers} email={email} />;
}

async function NewsletterWrapper() {
	const status = await getSubscriptionStatus();
	return <NewsletterSettingsCard isSubscribed={status.isSubscribed} />;
}

async function SessionsWrapper() {
	const sessions = await getUserSessions();
	return <ActiveSessionsCard sessions={sessions} />;
}

function SecuritySkeleton() {
	return (
		<SkeletonGroup label="Chargement des paramètres de sécurité">
			<section className="space-y-4">
				<div>
					<Skeleton className="h-5 w-24" />
					<Skeleton className="mt-0.5 h-4 w-64" />
				</div>
				<div className="border-border/60 space-y-6 border-t pt-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-52" />
						</div>
						<Skeleton className="h-9 w-24" />
					</div>
					<Skeleton className="h-4 w-32" />
				</div>
			</section>
		</SkeletonGroup>
	);
}

function NewsletterSkeleton() {
	return (
		<SkeletonGroup label="Chargement des paramètres newsletter">
			<section className="space-y-4">
				<div>
					<Skeleton className="h-5 w-32" />
					<Skeleton className="mt-0.5 h-4 w-48" />
				</div>
				<div className="border-border/60 space-y-3 border-t pt-4">
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
					<Skeleton className="h-5 w-40" />
					<Skeleton className="mt-0.5 h-4 w-28" />
				</div>
				<div className="border-border/60 border-t pt-4">
					<div className="divide-border/50 divide-y">
						{Array.from({ length: 2 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
								<Skeleton className="h-5 w-5" shape="circle" />
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

function computeDaysRemaining(deletionRequestedAt: Date | null): number {
	if (!deletionRequestedAt) return 0;
	const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
	const oneDayMs = 24 * 60 * 60 * 1000;
	return Math.max(
		0,
		Math.ceil((new Date(deletionRequestedAt).getTime() + thirtyDaysMs - Date.now()) / oneDayMs),
	);
}
