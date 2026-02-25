import { prisma } from "@/shared/lib/prisma"

export async function GET() {
	try {
		await prisma.$queryRawUnsafe("SELECT 1")
		return Response.json({ status: "ok" }, { status: 200 })
	} catch {
		return Response.json(
			{ status: "error", message: "Database unreachable" },
			{ status: 503 }
		)
	}
}
