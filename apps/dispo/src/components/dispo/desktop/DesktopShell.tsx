'use client'

import { useCallback, useState } from 'react'
import type { DispoState } from '../useDispoState'
import type { DispoView } from '../types'
import { Header } from './Header'
import { Legend } from './Legend'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { TimeSlider } from './TimeSlider'
import { VerticalTimeline } from './VerticalTimeline'

interface DesktopShellProps {
  state: DispoState
  lageplanSvg: string | null
}

export function DesktopShell({ state, lageplanSvg }: DesktopShellProps) {
  const [view, setView] = useState<DispoView>('vtimeline')
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null)

  const handleDragStartMatch = useCallback((e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('application/x-match-id', matchId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingMatchId(matchId)
  }, [])
  const handleDragEndMatch = useCallback(() => setDraggingMatchId(null), [])
  const isDragging = draggingMatchId !== null

  const mapProps = {
    svg: lageplanSvg,
    courts: state.courts,
    matches: state.matches,
    occupancy: state.occupancy,
    highlightCourtIds: state.highlightCourtIds,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    bookingsByCourt: state.bookings,
  }

  const vtlProps = {
    courts: state.courts,
    matches: state.matches,
    assignments: state.assignments,
    selectedId: state.selectedId,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    nowMinutes: state.nowMinutes,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    onUpdateAssignment: state.updateAssignment,
    onMoveAssignmentCourt: state.moveAssignmentCourt,
    onRemoveCourt: state.removeCourtFromAssignment,
    bookingsByCourt: state.bookings,
  }

  return (
    <div className="dispo-desktop-shell contents">
      <Header
        view={view}
        onViewChange={setView}
        issues={state.issues}
        onIssueSelect={state.selectMatch}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <div className="app-body">
        <Sidebar
          matches={state.matches}
          assignments={state.assignments}
          courts={state.courts}
          selectedId={state.selectedId}
          recentChangeMatchIds={state.recentChangeIds}
          onSelectMatch={state.selectMatch}
          onClearSelection={state.clearSelection}
          onDragStartMatch={handleDragStartMatch}
          onDragEndMatch={handleDragEndMatch}
          onResetAssignments={state.resetAssignments}
        />
        <div className="canvas-with-details">
          <main className="canvas">
            {view === 'map' && (
              <>
                <MapView {...mapProps} />
                <div className="map-cursor-ctrl">
                  <TimeSlider
                    value={state.cursorMinutes}
                    onChange={state.setCursorMinutes}
                    nowMinutes={state.nowMinutes}
                    label="Zeitpunkt"
                  />
                </div>
                <Legend />
              </>
            )}
            {view === 'vtimeline' && <VerticalTimeline {...vtlProps} />}
          </main>
        </div>
      </div>
    </div>
  )
}
