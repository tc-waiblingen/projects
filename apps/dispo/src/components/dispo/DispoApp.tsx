'use client'

import type { DispoCourt } from '@/lib/directus/courts'
import type { BookingsByCourt } from '@/lib/ebusy/reservations'
import type { DayStatus } from '@/components/DayNavigator'
import { DesktopShell } from './desktop/DesktopShell'
import { MobileShell } from './mobile/MobileShell'
import type { DispoAssignment, DispoMatch } from './types'
import { useDispoState } from './useDispoState'
import './dispo.css'

interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
  statusByKey: Record<string, DayStatus>
}

export function DispoApp(props: DispoAppProps) {
  const state = useDispoState(props)
  return (
    <>
      <div className="dispo-root app density-compact map-style-lageplan hidden md:flex">
        <DesktopShell state={state} lageplanSvg={props.lageplanSvg} />
      </div>
      <div className="dispo-root dispo-root-mobile md:hidden flex">
        <MobileShell
          state={state}
          date={props.date}
          prevDateKey={props.prevDateKey}
          nextDateKey={props.nextDateKey}
          formattedDate={props.formattedDate}
          statusByKey={props.statusByKey}
        />
      </div>
    </>
  )
}
