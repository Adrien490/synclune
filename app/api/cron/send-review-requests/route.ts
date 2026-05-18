import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { sendReviewRequests } from "@/modules/reviews/services/send-review-requests.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "send-review-requests",
		defaultErrorMessage: "Failed to send review-request emails",
	},
	() => sendReviewRequests(),
);
