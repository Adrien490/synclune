export function GET() {
	return new Response('{"version":3,"sources":[],"mappings":""}', {
		headers: { "Content-Type": "application/json" },
	});
}
