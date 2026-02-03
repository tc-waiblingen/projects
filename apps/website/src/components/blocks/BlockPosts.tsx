import Image from "next/image"
import Link from "next/link"
import type { BlockPost as BlockPostType, DirectusFile, Post } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { Eyebrow } from "@/components/elements/eyebrow"
import { fetchPosts, fetchPostsPaginated } from "@/lib/directus/fetchers"
import { getEditAttr } from "@/lib/visual-editing"
import { BlockPostsArchive } from "./BlockPostsArchive"

interface BlockPostsProps {
  data: BlockPostType
}

export async function BlockPosts({ data }: BlockPostsProps) {
  const { style } = data

  if (style === "archive") {
    return <PostsArchive data={data} />
  }

  return <PostsCards data={data} />
}

async function PostsCards({ data }: { data: BlockPostType }) {
  const { id, headline, tagline, limit } = data

  const eyebrow = tagline ? (
    <Eyebrow data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "tagline" })}>
      {tagline}
    </Eyebrow>
  ) : undefined

  const posts = await fetchPosts(limit ?? undefined)

  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <Section eyebrow={eyebrow} headline={headline ? (
      <span data-directus={getEditAttr({ collection: "block_posts", item: String(id), fields: "headline" })}>
        {headline}
      </span>
    ) : ""}>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </Section>
  )
}

async function PostsArchive({ data }: { data: BlockPostType }) {
  const { limit } = data
  const pageSize = limit ?? 10

  // Fetch initial page data for SSR
  const { posts, total } = await fetchPostsPaginated(pageSize, 0)
  const totalPages = Math.ceil(total / pageSize)

  const initialData = { posts, total, totalPages }

  return <BlockPostsArchive data={data} initialData={initialData} />
}

function PostCard({ post }: { post: Post }) {
  const { title, slug, description, image, published_at } = post

  if (!slug || !published_at) {
    return null
  }

  const year = new Date(published_at).getFullYear()
  const href = `/news/${year}/${slug}`

  const formattedDate = new Date(published_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Link href={href} className="group interactive-group">
      <article className="flex flex-col gap-4">
        {image && typeof image !== "string" && (
          <PostImage file={image} />
        )}
        <div className="flex flex-col gap-2">
          <time
            dateTime={published_at}
            className="text-sm text-tcw-accent-600 dark:text-tcw-accent-400"
          >
            {formattedDate}
          </time>
          <h3 className="text-lg group-hover:text-tcw-accent-700 group-active:text-tcw-accent-700 group-focus-visible:text-tcw-accent-700 dark:group-hover:text-tcw-accent-200 dark:group-active:text-tcw-accent-200 dark:group-focus-visible:text-tcw-accent-200">
            {title}
          </h3>
          {description && (
            <p className="line-clamp-2 text-sm text-tcw-accent-700 dark:text-tcw-accent-300">
              {description}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

function PostImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ""
  const alt = file.description ?? ""

  return (
    <div className="aspect-16/9 overflow-hidden rounded-lg">
      <Image
        src={src}
        title={title}
        alt={alt}
        width={file.width ?? 800}
        height={file.height ?? 450}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-105 group-focus-visible:scale-105"
      />
    </div>
  )
}
