export async function CopyrightYear() {
	"use cache"
	return <span suppressHydrationWarning>{new Date().getFullYear()}</span>
}
