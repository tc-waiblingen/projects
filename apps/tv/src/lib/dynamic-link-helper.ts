import { DirectusFile, Page, Post } from "@/types/directus-schema"

function GetLinkHref({
	type,
	url,
	page,
	post,
	file,
}: {
	type?: "page" | "post" | "url" | "file" | null
	url?: string | null
	page?: Page | string | null
	post?: Post | string | null
	file?: DirectusFile | string | null
}): string | null {
	switch (type) {
		case "url":
			return url ?? null
		case "page":
			if (page && typeof page !== "string" && page.permalink) {
				return page.permalink
			}
			return null
		case "post":
			if (post && typeof post !== "string" && post.slug && post.published_at) {
				const year = new Date(post.published_at).getFullYear()
				return `/news/${year}/${post.slug}`
			}
			return null
		case "file":
			if (file && typeof file !== "string" && file.id) {
				return `/api/files/${file.id}`
			}
			return null
		default:
			return url ?? null
	}
}

export { GetLinkHref }