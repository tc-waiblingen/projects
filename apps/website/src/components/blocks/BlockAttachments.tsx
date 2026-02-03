import type { BlockAttachment as BlockAttachmentType, DirectusFile } from '@/types/directus-schema'
import { Container } from '@/components/elements/container'
import { Eyebrow } from '@/components/elements/eyebrow'
import { Subheading } from '@/components/elements/subheading'
import { formatFileSize, FileIcon } from '@/lib/file-utils'
import { getEditAttr } from '@/lib/visual-editing'
import { clsx } from 'clsx/lite'

interface BlockAttachmentsProps {
  data: BlockAttachmentType
}

export function BlockAttachments({ data }: BlockAttachmentsProps) {
  const { id, headline, tagline, files, alignment } = data

  // Filter valid file items
  const attachmentFiles =
    files?.filter((item) => {
      if (typeof item === 'string') return false
      const file = item.directus_files_id
      return file && typeof file !== 'string' && file.id
    }) ?? []

  if (attachmentFiles.length === 0) {
    return null
  }

  const isCentered = alignment === 'center'

  return (
    <section className="py-8">
      <Container className={clsx('flex flex-col gap-6 sm:gap-10', isCentered && 'items-center')}>
        {(headline || tagline) && (
          <div className={clsx('flex max-w-2xl flex-col gap-2', isCentered && 'items-center')}>
            {tagline && (
              <Eyebrow
                className={isCentered ? 'text-center' : undefined}
                data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'tagline' })}
              >
                {tagline}
              </Eyebrow>
            )}
            {headline && (
              <Subheading
                className={isCentered ? 'text-center' : undefined}
                data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'headline' })}
              >
                {headline}
              </Subheading>
            )}
          </div>
        )}
        <ul
          className={clsx(
            'flex flex-wrap gap-4',
            isCentered ? 'justify-center' : 'justify-start'
          )}
          data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'files' })}
        >
          {attachmentFiles.map((item) => {
            if (typeof item === 'string') return null
            const file = item.directus_files_id as DirectusFile

            return <AttachmentItem key={item.id} file={file} />
          })}
        </ul>
      </Container>
    </section>
  )
}

interface AttachmentItemProps {
  file: DirectusFile
}

function AttachmentItem({ file }: AttachmentItemProps) {
  if (!file.id) return null

  const displayName = file.title || file.filename_download || 'Datei'
  const fileSize = formatFileSize(file.filesize)
  const extension = file.filename_download?.split('.').pop()?.toLowerCase() || ''

  return (
    <li className="w-28 sm:w-32">
      <a
        href={`/api/files/${file.id}`}
        download
        className="group interactive-group flex flex-col items-center gap-2 p-3 transition-colors hover:bg-tcw-accent-50 active:bg-tcw-accent-50 dark:hover:bg-tcw-accent-800 dark:active:bg-tcw-accent-800"
      >
        <div className="relative" title={displayName}>
          <FileIcon
            mimeType={file.type}
            className="h-16 w-16 text-tcw-accent-400 transition-colors group-hover:text-tcw-accent-600 group-active:text-tcw-accent-600 group-focus-visible:text-tcw-accent-600 dark:text-tcw-accent-500 dark:group-hover:text-tcw-accent-300 dark:group-active:text-tcw-accent-300 dark:group-focus-visible:text-tcw-accent-300"
          />
          {extension && (
            <span className="absolute right-0 bottom-0 rounded bg-tcw-accent-600 px-2 py-0.5 text-[7px] font-semibold leading-none text-white dark:bg-tcw-accent-500">
              {extension}
            </span>
          )}
        </div>
        <div className="flex w-full flex-col items-center gap-0.5">
          <p className="line-clamp-2 text-center text-sm font-medium text-tcw-accent-900 dark:text-white">
            {displayName}
          </p>
          <p className="text-xs text-tcw-accent-500 dark:text-tcw-accent-400">{fileSize}</p>
        </div>
      </a>
    </li>
  )
}
