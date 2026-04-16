import IcalExpander from "ical-expander";
import type {
  CalendarEvent,
  CalendarEventSource,
  FetchCalendarOptions,
  AppEventMetadata,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
  CalendarFetcherConfig,
  DirectusCalendarItem,
} from "./types";
import {
  fetchNrMatches,
  fetchNrTournaments,
  fetchNrTeams,
  fetchNrClub,
  type NrMatch,
  type NrTournament,
  type NrTeam,
} from "./nr-client";

/** Threshold for short vs long description (characters) */
const SHORT_DESCRIPTION_THRESHOLD = 100;

/**
 * Calculate display weight based on event source and description length.
 * Weight determines how much space an event takes in the TV display:
 * - 1 = compact (title only)
 * - 2 = medium (title + short description or match/tournament)
 * - 3 = large (title + long description)
 */
function calculateDisplayWeight(
  source: CalendarEventSource,
  description: string | null,
): number {
  if (source === "match" || source === "tournament") {
    return 2;
  }
  // Club and App events
  if (!description || description.trim() === "") {
    return 1;
  }
  const length = description.trim().length;
  return length <= SHORT_DESCRIPTION_THRESHOLD ? 2 : 3;
}

/** Common DirectusFile fields needed for image display */
export const DIRECTUS_FILE_FIELDS = [
  "id",
  "filename_disk",
  "filename_download",
  "title",
  "description",
  "type",
  "width",
  "height",
] as const;

/**
 * Helper to format time from Date as HH:MM
 */
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Decode HTML entities and strip HTML tags from text
 */
function decodeHtmlText(text: string): string {
  // Common HTML entities
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
    "&hellip;": "…",
    "&euro;": "€",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  let result = text;

  // Decode numeric entities (&#123; or &#x1F;)
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  // Decode named entities
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char);
  }

  // Convert <br> and <br/> to newlines
  result = result.replace(/<br\s*\/?>/gi, "\n");

  // Convert </p> and </div> to newlines (block elements)
  result = result.replace(/<\/(p|div)>/gi, "\n");

  // Strip remaining HTML tags
  result = result.replace(/<[^>]+>/g, "");

  // Normalize whitespace (collapse multiple spaces/newlines)
  result = result.replace(/[ \t]+/g, " ");
  result = result.replace(/\n\s*\n/g, "\n");
  result = result.trim();

  return result;
}

/**
 * Helper to parse datetime string from Directus (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * Returns the date and optional time component
 */
function parseDirectusDateTime(dateStr: string): {
  date: Date;
  time: string | null;
} {
  const [datePart, timePart] = dateStr.split("T");
  if (!datePart) {
    return { date: new Date(), time: null };
  }
  const parts = datePart.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(year, month - 1, day);

  // Extract time if present (format: HH:MM:SS or HH:MM)
  let time: string | null = null;
  if (timePart) {
    const timeMatch = /^(\d{2}):(\d{2})/.exec(timePart);
    const hours = timeMatch?.[1];
    const minutes = timeMatch?.[2];
    if (hours && minutes) {
      time = `${hours}:${minutes}`;
    }
  }

  return { date, time };
}

/**
 * Parse iCal text to extract ATTACH URLs by UID
 * Returns a map of UID -> attachment URL
 */
function parseIcalAttachments(icsData: string): Map<string, string> {
  const attachments = new Map<string, string>();

  // Split into events
  const eventBlocks = icsData.split("BEGIN:VEVENT");

  for (const block of eventBlocks) {
    if (!block.includes("END:VEVENT")) continue;

    // Extract UID
    const uidMatch = /^UID:(.+)$/m.exec(block);
    const uidValue = uidMatch?.[1];
    if (!uidValue) continue;
    const uid = uidValue.trim();

    // Extract ATTACH or IMAGE URL (could be on multiple lines with line folding)
    // Handle line folding by joining lines that start with space
    const unfoldedBlock = block.replace(/\r?\n[ \t]/g, "");

    // Look for ATTACH property with http URL
    const attachMatch = /^ATTACH[^:]*:(.+)$/m.exec(unfoldedBlock);
    const attachValue = attachMatch?.[1];
    if (attachValue) {
      const url = attachValue.trim();
      if (url.startsWith("http")) {
        attachments.set(uid, url);
        continue;
      }
    }

    // Also look for IMAGE property (used by some calendars)
    const imageMatch = /^IMAGE[^:]*:(.+)$/m.exec(unfoldedBlock);
    const imageValue = imageMatch?.[1];
    if (imageValue) {
      const url = imageValue.trim();
      if (url.startsWith("http")) {
        attachments.set(uid, url);
      }
    }
  }

  return attachments;
}

/**
 * Fetches and parses iCal feed from the app calendar URL
 */
export async function fetchAppCalendarEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {},
): Promise<CalendarEvent[]> {
  console.log("[fetchAppCalendarEvents] Function called");
  const calendarConfig = await config.fetchCalendarConfig();
  console.log(
    "[fetchAppCalendarEvents] Calendar config:",
    calendarConfig.appCalendarUrl ? "URL configured" : "NO URL",
  );

  if (!calendarConfig.appCalendarUrl) {
    console.warn("App calendar URL not configured");
    return [];
  }

  try {
    const response = await fetch(calendarConfig.appCalendarUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status}`);
    }

    const icsData = await response.text();
    console.log(
      "[fetchAppCalendarEvents] Fetched iCal data, length:",
      icsData.length,
    );

    // Parse attachments from raw iCal data
    const attachmentsMap = parseIcalAttachments(icsData);

    // Use ical-expander for date filtering and recurring events
    const expander = new IcalExpander({ ics: icsData, maxIterations: 1000 });

    const from = options.from ?? new Date();
    const to = options.to ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

    const { events, occurrences } = expander.between(from, to);
    console.log(
      "[fetchAppCalendarEvents] Date range:",
      from.toISOString(),
      "to",
      to.toISOString(),
    );
    console.log(
      "[fetchAppCalendarEvents] Found events:",
      events.length,
      "occurrences:",
      occurrences.length,
    );

    const calendarEvents: CalendarEvent[] = [];

    // Process single events
    for (const event of events) {
      const startDate = event.startDate.toJSDate();
      let endDate = event.endDate?.toJSDate() ?? null;
      const isAllDay = event.startDate.isDate;

      // iCal DTEND is exclusive for all-day events, so subtract one day for display
      if (isAllDay && endDate) {
        endDate = new Date(endDate);
        endDate.setDate(endDate.getDate() - 1);
      }

      const metadata: AppEventMetadata = {
        uid: event.uid,
        organizer: event.organizer || undefined,
      };

      // Extract RRULE if present
      const rruleProp = event.component.getFirstProperty("rrule");
      if (rruleProp) {
        metadata.rrule = String(rruleProp.getFirstValue());
      }

      // Extract categories
      const categories = event.component.getAllProperties("categories");
      if (categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata.categories = categories.flatMap((cat: any) =>
          (cat.getValues() as string[]).map(String),
        );
      }

      // Get image URL from attachments map
      const imageUrl = attachmentsMap.get(event.uid) || null;

      // Extract URL property if present
      const urlProp = event.component.getFirstPropertyValue("url");
      const eventUrl = urlProp ? String(urlProp) : null;

      // Check if event spans multiple days
      const isMultiDay = !!(
        endDate &&
        (startDate.getFullYear() !== endDate.getFullYear() ||
          startDate.getMonth() !== endDate.getMonth() ||
          startDate.getDate() !== endDate.getDate())
      );

      const description = event.description
        ? decodeHtmlText(event.description)
        : null;
      calendarEvents.push({
        id: `app-${event.uid}`,
        source: "app",
        title: event.summary || "Untitled Event",
        description,
        location: event.location || null,
        startDate,
        endDate,
        startTime: isAllDay ? null : formatTime(startDate),
        endTime: isAllDay || !endDate ? null : formatTime(endDate),
        isAllDay,
        isMultiDay,
        url: eventUrl,
        imageUrl,
        metadata,
        expandDays: true,
        displayWeight: calculateDisplayWeight("app", description),
      });
    }

    // Process recurring event occurrences
    for (const occurrence of occurrences) {
      const startDate = occurrence.startDate.toJSDate();
      let endDate = occurrence.endDate?.toJSDate() ?? null;
      const isAllDay = occurrence.startDate.isDate;
      const event = occurrence.item;

      // iCal DTEND is exclusive for all-day events, so subtract one day for display
      if (isAllDay && endDate) {
        endDate = new Date(endDate);
        endDate.setDate(endDate.getDate() - 1);
      }

      const metadata: AppEventMetadata = {
        uid: event.uid,
        recurrenceId: occurrence.recurrenceId?.toJSDate(),
        organizer: event.organizer || undefined,
      };

      // Extract categories
      const categories = event.component.getAllProperties("categories");
      if (categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata.categories = categories.flatMap((cat: any) =>
          (cat.getValues() as string[]).map(String),
        );
      }

      // Get image URL from attachments map
      const imageUrl = attachmentsMap.get(event.uid) || null;

      // Extract URL property if present
      const urlProp = event.component.getFirstPropertyValue("url");
      const eventUrl = urlProp ? String(urlProp) : null;

      // Check if event spans multiple days
      const isMultiDay = !!(
        endDate &&
        (startDate.getFullYear() !== endDate.getFullYear() ||
          startDate.getMonth() !== endDate.getMonth() ||
          startDate.getDate() !== endDate.getDate())
      );

      const description = event.description
        ? decodeHtmlText(event.description)
        : null;
      calendarEvents.push({
        id: `app-${event.uid}-${occurrence.recurrenceId?.toString() ?? startDate.toISOString()}`,
        source: "app",
        title: event.summary || "Untitled Event",
        description,
        location: event.location || null,
        startDate,
        endDate,
        startTime: isAllDay ? null : formatTime(startDate),
        endTime: isAllDay || !endDate ? null : formatTime(endDate),
        isAllDay,
        isMultiDay,
        url: eventUrl,
        imageUrl,
        metadata,
        expandDays: true,
        displayWeight: calculateDisplayWeight("app", description),
      });
    }

    // Filter out events with "Tischreservierung" category
    const filteredEvents = calendarEvents.filter((event) => {
      const categories = (event.metadata as AppEventMetadata).categories || [];
      const normalizedCategories = categories
        .flatMap((cat) => String(cat || "").split(","))
        .map((cat) => cat.trim().toLowerCase());
      return !normalizedCategories.includes("tischreservierung");
    });

    console.log(
      "[fetchAppCalendarEvents] Returning",
      filteredEvents.length,
      "events (filtered from",
      calendarEvents.length,
      ")",
    );
    if (filteredEvents.length > 0) {
      console.log(
        "[fetchAppCalendarEvents] Sample event:",
        filteredEvents[0]?.title,
        filteredEvents[0]?.metadata,
      );
    }
    return filteredEvents;
  } catch (error) {
    console.error("Error fetching app calendar events:", error);
    return [];
  }
}

/**
 * Fetches club events from Directus calendar collection
 */
export async function fetchClubEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {},
): Promise<CalendarEvent[]> {
  try {
    const from = options.from ?? new Date();
    const to = options.to;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directus SDK doesn't type _gte/_lte operators on date fields
    const filter: any = {
      status: { _eq: "published" },
      start_date: { _gte: from.toISOString().split("T")[0] },
    };

    if (to) {
      filter.start_date._lte = to.toISOString().split("T")[0];
    } else {
      // Default upper bound: at least 12 months out, or end of next year (whichever is later)
      const twelveMonthsOut = new Date(from);
      twelveMonthsOut.setFullYear(twelveMonthsOut.getFullYear() + 1);
      const endOfNextYear = new Date(from.getFullYear() + 1, 11, 31);
      const defaultTo =
        twelveMonthsOut > endOfNextYear ? twelveMonthsOut : endOfNextYear;
      filter.start_date._lte = defaultTo.toISOString().split("T")[0];
    }

    const events = (await config.directus.request(
      config.readItems("calendar", {
        filter,
        sort: ["start_date"],
        limit: -1,
        fields: ["*", { logo: [...DIRECTUS_FILE_FIELDS] }],
      }),
    )) as unknown as DirectusCalendarItem[];

    // Helper to check if two dates are on different days
    const isDifferentDay = (d1: Date, d2: Date) =>
      d1.getFullYear() !== d2.getFullYear() ||
      d1.getMonth() !== d2.getMonth() ||
      d1.getDate() !== d2.getDate();

    return events.map((event): CalendarEvent => {
      const start = parseDirectusDateTime(event.start_date);
      const end = event.end_date ? parseDirectusDateTime(event.end_date) : null;

      // Event is all-day if no time component is present OR if it spans multiple days
      const isMultiDay = !!(end?.date && isDifferentDay(start.date, end.date));
      const isAllDay = !start.time || isMultiDay;

      const metadata: ClubEventMetadata = {
        important: event.important ?? false,
        showOnTv: event.show_on_tv ?? false,
        category: event.category ?? null,
      };

      const description = event.description || null;

      return {
        id: `club-${event.id}`,
        source: "club",
        title: event.title || "Untitled Event",
        description,
        location: event.location || null,
        startDate: start.date,
        endDate: end?.date ?? null,
        // Clear time fields for multi-day events since they should be treated as all-day
        startTime: isMultiDay ? null : start.time,
        endTime: isMultiDay ? null : (end?.time ?? null),
        isAllDay,
        isMultiDay,
        url: event.website || null,
        imageUrl: event.logo ? config.getDirectusAssetURL(event.logo) : null,
        metadata,
        expandDays: event.expand_days ?? true,
        displayWeight: calculateDisplayWeight("club", description),
      };
    });
  } catch (error) {
    console.error("Error fetching club events:", error);
    return [];
  }
}

/**
 * Parse a YYYY-MM-DD date plus optional HH:MM time as a local-time Date.
 */
function parseNrDateTime(
  dateStr: string,
  timeStr?: string,
): { date: string; time: string | null; jsDate: Date } | null {
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  let hour = 0;
  let minute = 0;
  let time: string | null = null;
  if (timeStr) {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hour = Number(timeMatch[1]);
      minute = Number(timeMatch[2]);
      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  const jsDate = new Date(year, month - 1, day, hour, minute);
  const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  return { date, time, jsDate };
}

interface MatchMapContext {
  teamsById?: Map<string, NrTeam>;
  clubName?: string;
}

/**
 * Map an NrMatch to a CalendarEvent.
 * `context.teamsById` drives the title prefix, sort fields, and team-id filter support.
 * `context.clubName` is used as a location fallback for home matches when `match.location` is empty.
 */
function mapNrMatch(
  match: NrMatch,
  context: MatchMapContext = {},
): CalendarEvent | null {
  const parsed = parseNrDateTime(match.matchDate, match.matchTime);
  if (!parsed) return null;

  const team = context.teamsById?.get(match.teamId);
  const titlePrefix = team?.group || match.league;
  const title = titlePrefix
    ? `${titlePrefix}: ${match.homeTeam} vs. ${match.awayTeam}`
    : `${match.homeTeam} vs. ${match.awayTeam}`;

  let location: string | null = match.location || null;
  if (!location) {
    if (match.isHome) {
      location = context.clubName ?? "Heim";
    } else {
      location = "Auswärts";
    }
  }

  const metadata: MatchEventMetadata = {
    homeTeam: match.homeTeam,
    homeTeamUrl: match.homeTeamUrl,
    awayTeam: match.awayTeam,
    awayTeamUrl: match.awayTeamUrl,
    result: match.result,
    reportUrl: match.reportUrl,
    league: match.league || undefined,
    leagueFull: match.leagueFull,
    leagueUrl: match.leagueUrl,
    district: match.district,
    season: match.season,
    isHome: match.isHome,
    teamId: match.teamId,
    teamName: team?.name,
    seasonSort: team?.seasonSort,
    group: team?.group,
    groupUrl: team?.groupUrl,
  };

  return {
    id: match.id,
    source: "match",
    title,
    description: null,
    location,
    startDate: parsed.jsDate,
    endDate: null,
    startTime: parsed.time,
    endTime: null,
    isAllDay: !parsed.time,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata,
    expandDays: true,
    displayWeight: 2,
  };
}

/**
 * Map an NrTournament to a CalendarEvent.
 */
function mapNrTournament(tournament: NrTournament): CalendarEvent | null {
  const start = parseNrDateTime(tournament.dateStart);
  if (!start) return null;
  const end = tournament.dateEnd ? parseNrDateTime(tournament.dateEnd) : null;

  const isMultiDay = !!(
    end &&
    (start.jsDate.getFullYear() !== end.jsDate.getFullYear() ||
      start.jsDate.getMonth() !== end.jsDate.getMonth() ||
      start.jsDate.getDate() !== end.jsDate.getDate())
  );

  const metadata: TournamentEventMetadata = {
    category: tournament.category,
    registrationDeadline: tournament.registrationDeadline,
    entryFee: tournament.entryFee,
    callForEntriesUrl: tournament.callForEntriesUrl,
    registrationUrl: tournament.registrationUrl,
  };

  const description = tournament.registrationDeadline
    ? `Meldeschluss: ${tournament.registrationDeadline}`
    : null;

  return {
    id: tournament.id,
    source: "tournament",
    title: tournament.title,
    description,
    location: tournament.location || null,
    startDate: start.jsDate,
    endDate: end?.jsDate ?? null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay,
    url: tournament.registrationUrl ?? null,
    imageUrl: null,
    metadata,
    expandDays: true,
    displayWeight: 2,
  };
}

/**
 * Fetches match data from the nuliga-reader service.
 * Also fetches teams and club in parallel for title prefix, sort keys, and location fallback.
 */
export async function fetchMatches(
  _config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {},
): Promise<CalendarEvent[]> {
  const now = new Date();
  const fromDate =
    options.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = options.to ?? new Date(now.getFullYear() + 1, 11, 31);

  try {
    const [matchesResult, teamsResult, clubResult] = await Promise.allSettled([
      fetchNrMatches(fromDate, toDate),
      fetchNrTeams(),
      fetchNrClub(),
    ]);

    if (matchesResult.status !== "fulfilled") {
      console.error("[fetchMatches] Error:", matchesResult.reason);
      return [];
    }

    const teamsById = new Map<string, NrTeam>();
    if (teamsResult.status === "fulfilled") {
      for (const team of teamsResult.value) teamsById.set(team.id, team);
    } else {
      console.warn(
        "[fetchMatches] Teams fetch failed, title prefix and sort keys will be missing:",
        teamsResult.reason,
      );
    }

    const clubName =
      clubResult.status === "fulfilled" ? clubResult.value.name : undefined;
    if (clubResult.status !== "fulfilled") {
      console.warn(
        "[fetchMatches] Club fetch failed, location fallback will use 'Heim':",
        clubResult.reason,
      );
    }

    const context: MatchMapContext = { teamsById, clubName };
    const events: CalendarEvent[] = [];
    for (const item of matchesResult.value) {
      const event = mapNrMatch(item, context);
      if (!event) continue;
      if (event.startDate < fromDate || event.startDate > toDate) continue;
      events.push(event);
    }
    return events;
  } catch (error) {
    console.error("[fetchMatches] Error:", error);
    return [];
  }
}
/**
 * Fetches tournament data from the nuliga-reader service.
 */
export async function fetchTournaments(
  _config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {},
): Promise<CalendarEvent[]> {
  const now = new Date();
  const fromDate = options.from ?? (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  })();
  const toDate = options.to ?? (() => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  })();

  try {
    const items = await fetchNrTournaments(fromDate, toDate);
    const events: CalendarEvent[] = [];
    for (const item of items) {
      const event = mapNrTournament(item);
      if (!event) continue;
      if (event.startDate < fromDate || event.startDate > toDate) continue;
      events.push(event);
    }
    return events;
  } catch (error) {
    console.error("[fetchTournaments] Error:", error);
    return [];
  }
}

/**
 * Fetches completed match results from the past months
 * @param months Number of months to look back (default: 2)
 * @param limit Maximum number of results to return (default: 12)
 */
export async function fetchMatchResults(
  config: CalendarFetcherConfig,
  months: number = 2,
  limit: number = 12,
): Promise<CalendarEvent[]> {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);

  const matches = await fetchMatches(config, { from, to: now });

  // Filter for matches with results and sort by date descending (most recent first)
  const completedMatches = matches
    .filter((match) => {
      const metadata = match.metadata as MatchEventMetadata;
      return metadata.result && metadata.result.trim() !== "";
    })
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, limit);

  return completedMatches;
}

/**
 * Fetches all calendar events from all sources in parallel
 */
export async function fetchAllCalendarEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {},
): Promise<CalendarEvent[]> {
  console.log("[fetchAllCalendarEvents] Starting fetch with options:", options);
  const results = await Promise.allSettled([
    fetchAppCalendarEvents(config, options),
    fetchClubEvents(config, options),
    fetchMatches(config, options),
    fetchTournaments(config, options),
  ]);

  const allEvents: CalendarEvent[] = [];

  const sources = ["app", "club", "match", "tournament"];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (result.status === "fulfilled") {
      console.log(
        `[fetchAllCalendarEvents] ${sources[i]}: ${result.value.length} events`,
      );
      allEvents.push(...result.value);
    } else {
      console.error(
        `[fetchAllCalendarEvents] ${sources[i]} failed:`,
        result.reason,
      );
    }
  }

  // Sort by start date
  allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return allEvents;
}

// Export helper functions for testing
export const _testHelpers = {
  formatTime,
  decodeHtmlText,
  parseDirectusDateTime,
  parseIcalAttachments,
  parseNrDateTime,
  mapNrMatch,
  mapNrTournament,
};
