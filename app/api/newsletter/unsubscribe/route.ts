import { NextResponse } from "next/server";
import { NewsletterStatus } from "@/app/generated/prisma/client";
import { ajNewsletterUnsubscribe } from "@/shared/lib/arcjet";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "@/modules/newsletter/constants/cache";
import { unsubscribeTokenSchema } from "@/modules/newsletter/schemas/newsletter.schemas";

/**
 * RFC 8058 One-Click Unsubscribe handler.
 *
 * Gmail/Yahoo send a POST to the List-Unsubscribe URL with
 * body "List-Unsubscribe=One-Click". The token is read from
 * the URL query params. Returns 200 OK in all cases per RFC 8058.
 */
export async function POST(request: Request) {
	try {
		// Arcjet protection
		const decision = await ajNewsletterUnsubscribe.protect(request, {
			requested: 1,
		});

		if (decision.isDenied()) {
			// RFC 8058: return 200 even on denial to avoid retries
			return new NextResponse(null, { status: 200 });
		}

		// Read token from query params
		const { searchParams } = new URL(request.url);
		const token = searchParams.get("token");

		const parsed = unsubscribeTokenSchema.safeParse({ token });
		if (!parsed.success) {
			return new NextResponse(null, { status: 200 });
		}

		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: {
				unsubscribeToken: parsed.data.token,
				deletedAt: null,
			},
		});

		if (
			subscriber &&
			subscriber.status !== NewsletterStatus.UNSUBSCRIBED
		) {
			await prisma.newsletterSubscriber.update({
				where: { id: subscriber.id },
				data: {
					status: NewsletterStatus.UNSUBSCRIBED,
					unsubscribedAt: new Date(),
				},
			});

			getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));
		}

		return new NextResponse(null, { status: 200 });
	} catch (e) {
		console.error("[NEWSLETTER_UNSUBSCRIBE_API]", e);
		// RFC 8058: always return 200 to prevent mail providers from retrying
		return new NextResponse(null, { status: 200 });
	}
}
