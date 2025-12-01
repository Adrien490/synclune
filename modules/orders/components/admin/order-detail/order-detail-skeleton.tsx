import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/shared/components/ui/card";

export function OrderDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-9 w-9" />
				</div>
			</div>

			{/* Stepper */}
			<div className="flex items-center justify-between px-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="flex flex-col items-center gap-2">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-3 w-16" />
					</div>
				))}
			</div>

			{/* Status badges */}
			<div className="flex gap-2">
				<Skeleton className="h-6 w-24" />
				<Skeleton className="h-6 w-20" />
				<Skeleton className="h-6 w-28" />
			</div>

			{/* Main grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Items Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex items-start gap-4 py-3 border-b last:border-0">
									<Skeleton className="h-16 w-16 rounded-md" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-3 w-32" />
										<Skeleton className="h-3 w-20" />
									</div>
									<Skeleton className="h-5 w-16" />
								</div>
							))}
							<div className="space-y-2 pt-4">
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-16" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-14" />
								</div>
								<div className="flex justify-between pt-2">
									<Skeleton className="h-6 w-12" />
									<Skeleton className="h-6 w-20" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Shipping Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-24" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-between items-center">
								<div className="space-y-2">
									<Skeleton className="h-3 w-28" />
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-3 w-24" />
								</div>
								<div className="flex gap-2">
									<Skeleton className="h-9 w-9" />
									<Skeleton className="h-9 w-20" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					{/* Customer Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-16" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-32" />
						</CardContent>
					</Card>

					{/* Address Card */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-8 w-8" />
						</CardHeader>
						<CardContent className="space-y-1">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-20" />
						</CardContent>
					</Card>

					{/* Payment Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-20" />
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="space-y-1">
								<Skeleton className="h-3 w-32" />
								<Skeleton className="h-4 w-40" />
							</div>
						</CardContent>
					</Card>

					{/* Timeline Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
						</CardHeader>
						<CardContent className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="h-8 w-8 rounded-full shrink-0" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
