import { DirectusFile, NavigationItem, Page, Post } from "@/types/directus-schema"

function getPostPath(slug: string, publishedAt?: string | null): string {
	if (publishedAt) {
		return `/news/${new Date(publishedAt).getFullYear()}/${slug}`
	}
	return `/news/${slug}`
}

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
			if (post && typeof post !== "string" && post.slug) {
				return getPostPath(post.slug, post.published_at)
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

function getNavItemHref(
	item: Pick<NavigationItem, "type" | "url" | "page" | "post" | "file">,
): string | null {
	if (!item.type || item.type === "group" || item.type === "divider") {
		return null
	}
	return GetLinkHref({ type: item.type, url: item.url, page: item.page, post: item.post, file: item.file })
}

function isActiveLink(href: string, currentPath: string): boolean {
	if (href === "/") {
		return currentPath === "/"
	}
	return currentPath === href || currentPath.startsWith(href + "/")
}

export { GetLinkHref, getNavItemHref, getPostPath, isActiveLink }
