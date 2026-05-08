import { scryptSync } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
	console.error("Seed minimal interdit en production.");
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL manquant.");
	process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@synclune.fr";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password123";
const salt = "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5";
const derived = scryptSync(adminPassword.normalize("NFKC"), salt, 64);
const passwordHash = `${salt}:${derived.toString("hex")}`;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	const settings = await prisma.storeSettings.upsert({
		where: { id: "store-settings-singleton" },
		update: {},
		create: { id: "store-settings-singleton" },
	});
	console.log(`StoreSettings OK (id: ${settings.id})`);

	const adminId = "admin-dev-user";
	await prisma.user.upsert({
		where: { email: adminEmail },
		update: { role: "ADMIN", emailVerified: true, name: "Admin Dev" },
		create: {
			id: adminId,
			role: "ADMIN",
			name: "Admin Dev",
			email: adminEmail,
			emailVerified: true,
		},
	});

	const user = await prisma.user.findUnique({ where: { email: adminEmail } });
	if (!user) throw new Error("admin user not found after upsert");

	await prisma.account.deleteMany({
		where: { userId: user.id, providerId: "credential" },
	});
	await prisma.account.create({
		data: {
			id: "admin-dev-credential",
			accountId: user.id,
			providerId: "credential",
			userId: user.id,
			password: passwordHash,
		},
	});
	console.log(`Admin OK — email: ${adminEmail} / password: ${adminPassword}`);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
