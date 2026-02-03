declare module 'ical-expander' {
  interface ICALTime {
    toJSDate(): Date
    toString(): string
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    isDate: boolean
  }

  interface ICALDuration {
    weeks: number
    days: number
    hours: number
    minutes: number
    seconds: number
    isNegative: boolean
  }

  interface ICALComponent {
    getFirstPropertyValue(name: string): string | null
    getAllProperties(name: string): ICALProperty[]
    getFirstProperty(name: string): ICALProperty | null
  }

  interface ICALProperty {
    getFirstValue(): unknown
    getValues(): unknown[]
    name: string
  }

  interface ICALEvent {
    uid: string
    summary: string
    description: string
    location: string
    startDate: ICALTime
    endDate: ICALTime
    duration: ICALDuration
    organizer: string
    attendees: unknown[]
    recurrenceId: ICALTime | null
    component: ICALComponent
  }

  interface OccurrenceDetails {
    item: ICALEvent
    startDate: ICALTime
    endDate: ICALTime
    recurrenceId: ICALTime
  }

  interface ExpansionResults {
    events: ICALEvent[]
    occurrences: OccurrenceDetails[]
  }

  interface ConstructorOpts {
    ics: string
    maxIterations?: number
    skipInvalidDates?: boolean
  }

  class IcalExpander {
    constructor(opts: ConstructorOpts)
    between(after: Date, before: Date): ExpansionResults
    before(before: Date): ExpansionResults
    after(after: Date): ExpansionResults
    all(): ExpansionResults
  }

  export = IcalExpander
}
