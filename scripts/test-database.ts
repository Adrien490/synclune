import "dotenv/config";
import { prisma } from "../shared/lib/prisma";

async function testDatabase() {
	console.log("Testing Prisma Neon connection...\n");

	try {
		// Test 1: Check connection by counting users
		console.log("Testing connection...");
		const userCount = await prisma.user.count();
		console.log(`Connected! Found ${userCount} user(s) in database.`);

		// Test 2: Fetch a sample of users
		console.log("\nFetching sample users...");
		const users = await prisma.user.findMany({
			take: 5,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
			},
		});

		if (users.length > 0) {
			console.log(`Found ${users.length} user(s):`);
			for (const user of users) {
				console.log(`   - ${user.name || "No name"} (${user.email}) [${user.role}]`);
			}
		} else {
			console.log("No users in database yet.");
		}

		// Test 3: Check products count
		console.log("\nChecking products...");
		const productCount = await prisma.product.count();
		console.log(`Found ${productCount} product(s) in database.`);

		// Test 4: Check orders count
		console.log("\nChecking orders...");
		const orderCount = await prisma.order.count();
		console.log(`Found ${orderCount} order(s) in database.`);

		console.log("\nAll tests passed! Database connection is working.\n");
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

testDatabase();
