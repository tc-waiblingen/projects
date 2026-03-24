import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupSelect } from '../GroupSelect'
import type { GroupEntry } from '../FilterControls'

const entries: GroupEntry[] = [
  { value: 'Herren 50', label: 'Herren 50 (Württemberg)', league: 'Herren 50', district: 'Württemberg', season: 'Sommer 2025' },
  { value: 'Herren 40', label: 'Herren 40 (Bezirk)', league: 'Herren 40', district: 'Bezirk', season: 'Sommer 2025' },
  { value: 'Damen', label: 'Damen (Württemberg)', league: 'Damen', district: 'Württemberg', season: 'Sommer 2025' },
  { value: 'Herren 50 Winter', label: 'Herren 50 (Bezirk)', league: 'Herren 50', district: 'Bezirk', season: 'Winter 2024/25' },
  { value: 'Junioren U14', label: 'Junioren U14 (Bezirk)', league: 'Junioren U14', district: 'Bezirk', season: 'Winter 2024/25' },
]

describe('GroupSelect', () => {
  it('renders trigger with placeholder when no value selected', () => {
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)
    expect(screen.getByRole('button', { name: /Gruppe\/Mannschaft wählen/i })).toBeInTheDocument()
  })

  it('renders trigger with selected entry label', () => {
    render(<GroupSelect value="Herren 50" onChange={() => {}} groupEntries={entries} />)
    expect(screen.getByRole('button', { name: /Herren 50/i })).toBeInTheDocument()
  })

  it('opens dropdown and shows season headers with team counts', async () => {
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))

    const sommer = screen.getByText('Sommer 2025')
    expect(sommer).toBeInTheDocument()
    // Count badge is a sibling within the same season header row
    expect(sommer.closest('[aria-hidden]')?.textContent).toContain('3')

    const winter = screen.getByText('Winter 2024/25')
    expect(winter).toBeInTheDocument()
    expect(winter.closest('[aria-hidden]')?.textContent).toContain('2')
  })

  it('shows team options with district text', async () => {
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getAllByText(/Württemberg/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bezirk/).length).toBeGreaterThan(0)
  })

  it('calls onChange with value when option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={onChange} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: /Herren 40/i }))

    expect(onChange).toHaveBeenCalledWith('Herren 40')
  })

  it('calls onChange with null when "Alle anzeigen" is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupSelect value="Herren 50" onChange={onChange} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: /Alle anzeigen/i }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('renders flat list without season headers for single unnamed season', async () => {
    const flatEntries: GroupEntry[] = [
      { value: 'Herren 50', label: 'Herren 50 (Bezirk)', league: 'Herren 50', district: 'Bezirk' },
      { value: 'Damen', label: 'Damen (Württemberg)', league: 'Damen', district: 'Württemberg' },
    ]
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={flatEntries} />)

    await user.click(screen.getByRole('button'))

    // Options should be present
    expect(screen.getByRole('option', { name: /Herren 50/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Damen/i })).toBeInTheDocument()
    // No season header elements (they use aria-hidden)
    expect(screen.queryByText('Sonstige')).not.toBeInTheDocument()
  })
})
