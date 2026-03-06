import { cache } from 'react'
import { Court, DirectusFile, Form, Global, Navigation, OfficeClosingDay, OfficeHour, Page, Post, Redirect, Sponsor, Team, Trainer } from "@/types/directus-schema"
import { getDirectus } from "./directus"

/** Common DirectusFile fields needed for image display */
const DIRECTUS_FILE_FIELDS = ["id", "filename_disk", "filename_download", "title", "description", "type", "width", "height"] as const

export const fetchAllPages = async () => {
  const { directus, readItems } = getDirectus()

  const pages = await directus.request(
    readItems("pages", {
      filter: { status: { _eq: "published" } },
      fields: ["permalink"],
    }),
  )

  return pages
}

export const fetchPageData = async (permalink: string /*, postPage = 1 */) => {
  const { directus, readItems } = getDirectus()

  try {
    const pageData = await directus.request(
      readItems("pages", {
        filter: { permalink: { _eq: permalink } },
        limit: 1,
        fields: [
          "*",
          "posts.post_id.*",
          "blocks.*",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directus SDK doesn't support deep field type inference
          "blocks.item.*.*.*.*" as any,
        ],
        deep: {
          blocks: { _sort: ["sort"], _filter: { hide_block: { _neq: true } } },
        },
      }),
    )

    if (!pageData.length) {
      throw new Error("Page not found")
    }

    const page = pageData[0] as Page

    return page
  } catch (error) {
    console.error("Error fetching page data for " + permalink + ":", error)
    throw new Error("Failed to fetch page data")
  }
}

/**
 * Fetches global site data, header navigation, and footer navigation.
 */
export const fetchSiteData = async () => {
  const { directus, readSingleton, readItems, readItem } = getDirectus()
  const today = new Date().toISOString().split('T')[0];

  try {
    const [untypedGlobals, untypedOfficeHours, untypedOfficeClosingDays, untypedNavMain, untypedNavCTA, untypedNavFooter, untypedSponsors] = await Promise.all([
      directus.request(readSingleton("global", {
        fields: ["*"],
      })),
      directus.request(readItems("office_hours", {
        sort: ["sort", "starts_at"],
        fields: ["day", "starts_at", "ends_at"],
      })),
      directus.request(readItems("office_closing_days", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directus SDK doesn't type _gte operator on date fields
        filter: { date: { _gte: today } } as any,
        sort: ['date'],
        fields: ['date'],
      })),
      directus.request(
        readItem("navigation", "main", {
          filter: {
            is_active: { _eq: true },
          },
          fields: [
            "id",
            "title",
            {
              items: [
                "id",
                "title",
                "url",
                "type",
                "is_primary",
                "primary_on_mobile",
                {
                  page: ["permalink"],
                  post: ["slug", "published_at"],
                  children: ["id", "title", "url", "is_primary", "primary_on_mobile", "type", { page: ["permalink"], post: ["slug", "published_at"] }],
                },
              ],
            },
          ],
          deep: { items: { _sort: ["sort"] } },
        })
      ),
      directus.request(
        readItem("navigation", "cta", {
          filter: {
            is_active: { _eq: true },
          },
          fields: [
            "id",
            "title",
            {
              items: [
                "id",
                "title",
                "url",
                "type",
                "is_primary",
                "primary_on_mobile",
                {
                  page: ["permalink"],
                  post: ["slug", "published_at"],
                  children: ["id", "title", "url", "is_primary", "primary_on_mobile", "type", { page: ["permalink"], post: ["slug", "published_at"] }],
                },
              ],
            },
          ],
          deep: { items: { _sort: ["sort"] } },
        })
      ),
      directus.request(
        readItem("navigation", "footer", {
          filter: {
            is_active: { _eq: true },
          },
          fields: [
            "id",
            "title",
            {
              items: [
                "id",
                "title",
                "url",
                "type",
                {
                  page: ["permalink"],
                  post: ["slug", "published_at"],
                  children: ["id", "title", "url", "type", { page: ["permalink"], post: ["slug", "published_at"] }],
                },
              ],
            },
          ],
          deep: {
            items: {
              _sort: ["sort"],
              children: { _sort: ["sort"] },
            },
          },
        })
      ),
      directus.request(
        readItems("sponsors", {
          filter: { status: { _eq: "active" } },
          sort: ["category", "sort"],
          fields: ["id", "name", "category", "description", "address_line1", "address_line2", "address_zip_code", "address_city", "phone", "email", "website", "instagram", "facebook", { logo_web: [...DIRECTUS_FILE_FIELDS] }],
        })
      ),
    ])

    const globals = untypedGlobals as Global
    const officeHours = untypedOfficeHours as OfficeHour[]
    const officeClosingDays = untypedOfficeClosingDays as OfficeClosingDay[]
    const navMain = untypedNavMain as Navigation
    const navCTA = untypedNavCTA as Navigation
    const navFooter = untypedNavFooter as Navigation
    const sponsors = untypedSponsors as unknown as Sponsor[]

    return { globals, officeHours, officeClosingDays, navMain, navCTA, navFooter, sponsors }
  } catch (error) {
    console.error("Error fetching site data:", error)
    throw new Error("Failed to fetch site data")
  }
}

/**
 * Cached version of fetchSiteData. Uses React's cache() to deduplicate
 * requests within a single render pass, preventing N+1 API queries.
 */
export const getSiteData = cache(fetchSiteData)

export const fetchPosts = async (limit?: number) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: { status: { _eq: "published" } },
        sort: ["-published_at"],
        limit: limit ?? 10,
        fields: ["id", "title", "slug", "description", { image: [...DIRECTUS_FILE_FIELDS] }, "published_at"],
      }),
    )

    return posts as unknown as Post[]
  } catch (error) {
    console.error("Error fetching posts:", error)
    throw new Error("Failed to fetch posts")
  }
}

export const fetchPostsPaginated = async (limit: number, offset: number) => {
  const { directus, readItems, aggregate } = getDirectus()

  try {
    const [posts, countResult] = await Promise.all([
      directus.request(
        readItems("posts", {
          filter: { status: { _eq: "published" } },
          sort: ["-published_at"],
          limit,
          offset,
          fields: ["id", "title", "slug", "description", { image: [...DIRECTUS_FILE_FIELDS] }, "published_at"],
        }),
      ),
      directus.request(
        aggregate("posts", {
          aggregate: { count: "*" },
          query: { filter: { status: { _eq: "published" } } },
        }),
      ),
    ])

    return {
      posts: posts as unknown as Post[],
      total: Number(countResult[0]?.count ?? 0),
    }
  } catch (error) {
    console.error("Error fetching paginated posts:", error)
    throw new Error("Failed to fetch paginated posts")
  }
}

export const fetchAllPublishedPosts = async () => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: { status: { _eq: "published" } },
        fields: ["slug", "published_at"],
      }),
    )

    return posts as Post[]
  } catch (error) {
    console.error("Error fetching all posts:", error)
    throw new Error("Failed to fetch all posts")
  }
}

export const fetchPostBySlug = async (slug: string, year?: string) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: {
          status: { _eq: "published" },
          slug: { _eq: slug },
        },
        limit: 1,
        fields: ["*", { image: [...DIRECTUS_FILE_FIELDS], author: ["first_name", "last_name"] }],
      }),
    )

    if (!posts.length) {
      return null
    }

    const post = posts[0] as unknown as Post

    // If year is provided, verify it matches
    if (year && post.published_at) {
      const postYear = new Date(post.published_at).getFullYear().toString()
      if (postYear !== year) {
        return null
      }
    }

    return post
  } catch (error) {
    console.error("Error fetching post:", error)
    throw new Error("Failed to fetch post")
  }
}

/**
 * Fetches a post by slug without status filtering, for preview purposes.
 * Used to display drafts and scheduled posts in development mode.
 */
export const fetchPostForPreview = async (slug: string, year?: string) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: {
          slug: { _eq: slug },
        },
        limit: 1,
        fields: ["*", { image: [...DIRECTUS_FILE_FIELDS], author: ["first_name", "last_name"] }],
      }),
    )

    if (!posts.length) {
      return null
    }

    const post = posts[0] as unknown as Post

    // If year is provided, verify it matches
    if (year && post.published_at) {
      const postYear = new Date(post.published_at).getFullYear().toString()
      if (postYear !== year) {
        return null
      }
    }

    return post
  } catch (error) {
    console.error("Error fetching post for preview:", error)
    throw new Error("Failed to fetch post for preview")
  }
}

export const fetchPostBySlugOnly = async (slug: string) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: {
          status: { _eq: "published" },
          slug: { _eq: slug },
          published_at: { _null: true },
        },
        limit: 1,
        fields: ["*", { image: [...DIRECTUS_FILE_FIELDS], author: ["first_name", "last_name"] }],
      }),
    )

    if (!posts.length) {
      return null
    }

    return posts[0] as unknown as Post
  } catch (error) {
    console.error("Error fetching post:", error)
    throw new Error("Failed to fetch post")
  }
}

export const fetchPostsForRSS = async (limit?: number) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: { status: { _eq: "published" } },
        sort: ["-published_at"],
        limit: limit ?? 10,
        fields: ["id", "title", "slug", "description", "content", "published_at"],
      }),
    )

    return posts as Post[]
  } catch (error) {
    console.error("Error fetching posts for RSS:", error)
    throw new Error("Failed to fetch posts for RSS")
  }
}

export const fetchTeamMembers = async () => {
  const { directus, readItems } = getDirectus()

  try {
    const team = await directus.request(
      readItems("team", {
        filter: { status: { _eq: "published" } },
        sort: ["sort"],
        fields: ["id", "name", "function", { picture: [...DIRECTUS_FILE_FIELDS] }],
      }),
    )

    return team as unknown as Team[]
  } catch (error) {
    console.error("Error fetching team members:", error)
    throw new Error("Failed to fetch team members")
  }
}

export const fetchTrainers = async () => {
  const { directus, readItems } = getDirectus()

  try {
    const trainers = await directus.request(
      readItems("trainers", {
        filter: { status: { _eq: "published" } },
        sort: ["sort"],
        fields: ["id", "name", "phone", "email", "website", { banner: [...DIRECTUS_FILE_FIELDS] }],
      }),
    )

    return trainers as unknown as Trainer[]
  } catch (error) {
    console.error("Error fetching trainers:", error)
    throw new Error("Failed to fetch trainers")
  }
}

export const fetchRedirectByPath = async (path: string) => {
  const { directus, readItems } = getDirectus()

  try {
    const redirects = await directus.request(
      readItems("redirects", {
        filter: { url_from: { _eq: path } },
        fields: ["url_from", "url_to", "response_code"],
        limit: 1,
      }),
    )

    return redirects[0] as Redirect | undefined
  } catch (error) {
    console.error("Error fetching redirect:", error)
    return undefined
  }
}

export const fetchFormById = async (formId: string) => {
  const { directus, readItem } = getDirectus()

  try {
    const form = await directus.request(
      readItem("forms", formId, {
        fields: [
          "id",
          "is_active",
          "title",
          {
            fields: ["id", "name", "type", "label", "required", "validation"],
          },
        ],
      }),
    )

    return form as Form | null
  } catch (error) {
    console.error("Error fetching form:", error)
    return null
  }
}

export async function fetchFilesByIds(fileIds: string[]): Promise<DirectusFile[]> {
  if (fileIds.length === 0) return []

  const { directus, readFiles } = getDirectus()

  try {
    const files = await directus.request(
      readFiles({
        filter: { id: { _in: fileIds } },
        fields: ["id", "title", "description", "type", "width", "height"],
      }),
    )

    return files as unknown as DirectusFile[]
  } catch (error) {
    console.error("Error fetching files by IDs:", error)
    return []
  }
}

export const fetchPostsByGroup = async (groupId: number, limit?: number) => {
  const { directus, readItems } = getDirectus()

  try {
    const posts = await directus.request(
      readItems("posts", {
        filter: {
          status: { _eq: "published" },
          group: { _eq: groupId },
        },
        sort: ["published_at"],
        limit: limit ?? -1,
        fields: ["id", "title", "slug", "published_at"],
      }),
    )

    return posts as Post[]
  } catch (error) {
    console.error("Error fetching posts by group:", error)
    throw new Error("Failed to fetch posts by group")
  }
}

export async function fetchCourtsWithSponsors() {
  const { directus, readItems } = getDirectus()

  try {
    const courts = await directus.request(
      readItems("courts", {
        filter: { status: { _eq: "published" } },
        sort: ["sort"],
        fields: [
          "id",
          "name",
          "type",
          {
            sponsors: [
              "id",
              {
                sponsors_id: [
                  "id",
                  "sort",
                  "name",
                  "description",
                  "address_line1",
                  "address_line2",
                  "address_zip_code",
                  "address_city",
                  "phone",
                  "email",
                  "website",
                  "instagram",
                  "facebook",
                  { logo_web: [...DIRECTUS_FILE_FIELDS] },
                ],
              },
            ],
          },
        ],
      }),
    )

    return courts as unknown as Court[]
  } catch (error) {
    console.error("Error fetching courts with sponsors:", error)
    throw new Error("Failed to fetch courts with sponsors")
  }
}
