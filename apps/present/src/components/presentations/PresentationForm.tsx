import type { Presentation } from '@/lib/presentations'

export function PresentationForm({ presentation, suggestedCode }: { presentation?: Presentation; suggestedCode?: string }) {
  const action = presentation ? `/api/presentations/${presentation.code}` : '/api/presentations'

  return (
    <form
      method="post"
      action={action}
      autoComplete="off"
      className="grid gap-5 rounded-lg border border-tcw-accent-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-body">
          Title
          <input
            name="title"
            required
            minLength={3}
            defaultValue={presentation?.title}
            className="rounded-md border border-tcw-accent-200 px-3 py-2 font-normal focus:border-tcw-red-500 focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-body">
          Presentation code
          <input
            name="code"
            required={!presentation}
            disabled={Boolean(presentation)}
            placeholder="WAI-0626"
            defaultValue={presentation?.code ?? suggestedCode}
            className="rounded-md border border-tcw-accent-200 px-3 py-2 font-normal uppercase focus:border-tcw-red-500 focus:outline-none disabled:bg-tcw-accent-50"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-body">
          Date
          <input
            name="startsAt"
            type="date"
            defaultValue={presentation?.startsAt ?? undefined}
            className="rounded-md border border-tcw-accent-200 px-3 py-2 font-normal focus:border-tcw-red-500 focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-body">
          Viewer password
          <input
            name="viewerPassword"
            type="password"
            minLength={4}
            autoComplete="off"
            placeholder={presentation ? 'Leave empty to keep current password' : 'Optional'}
            className="rounded-md border border-tcw-accent-200 px-3 py-2 font-normal focus:border-tcw-red-500 focus:outline-none"
          />
        </label>
        {presentation && (
          <label className="flex items-center gap-2 self-end text-sm font-semibold text-body">
            <input
              name="clearViewerPassword"
              type="checkbox"
              value="1"
              className="h-4 w-4 cursor-pointer rounded border-tcw-accent-200 text-tcw-red-700"
            />
            No viewer password
          </label>
        )}
      </div>
      <label className="grid gap-1 text-sm font-semibold text-body">
        Status
        <select
          name="status"
          defaultValue={presentation?.status ?? 'draft'}
          className="max-w-xs cursor-pointer rounded-md border border-tcw-accent-200 px-3 py-2 font-normal focus:border-tcw-red-500 focus:outline-none"
        >
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="live" disabled>
            Live
          </option>
          <option value="ended" disabled>
            Ended
          </option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-semibold text-white hover:bg-tcw-red-500">
          {presentation ? 'Save presentation' : 'Create presentation'}
        </button>
        {presentation && (
          <>
            <a className="rounded-md border border-tcw-accent-200 bg-white px-4 py-2 font-semibold text-body hover:bg-tcw-accent-50" href={`/moderator/${presentation.code}`}>
              Open control room
            </a>
            <a className="rounded-md border border-tcw-accent-200 bg-white px-4 py-2 font-semibold text-body hover:bg-tcw-accent-50" href={`/presentations/${presentation.code}/handout`}>
              Handout
            </a>
          </>
        )}
      </div>
    </form>
  )
}
