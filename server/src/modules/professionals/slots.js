// Kenya is on East Africa Time all year (UTC+3, no daylight saving), so working
// hours can be turned into exact times with a fixed offset.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// People cannot book a session that starts in less than this.
const LEAD_TIME_MS = 2 * 60 * MINUTE_MS;

export const BOOKING_WINDOW_DAYS = 14;

// Turns a professional's weekly hours into the list of start times that are
// still free. `taken` is the start times of their pending and confirmed sessions;
// `busy` is [{ start, end }] from their own calendar (Google), when connected.
export function openSlots(professional, taken = [], now = new Date(), busy = []) {
    const length = professional.sessionMinutes || 50;
    const takenTimes = new Set(taken.map((date) => new Date(date).getTime()));
    const earliest = now.getTime() + LEAD_TIME_MS;
    const busyRanges = busy.map((range) => [new Date(range.start).getTime(), new Date(range.end).getTime()]);
    const isBusy = (start) => busyRanges.some(([from, to]) => start < to && start + length * MINUTE_MS > from);
    const today = new Date(now.getTime() + EAT_OFFSET_MS);
    const slots = [];

    for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset++) {
        // Midnight of the local day, expressed as if it were UTC
        const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
        const hours = (professional.availability || []).filter((window) => window.day === day.getUTCDay());

        for (const window of hours) {
            for (let minute = window.start; minute + length <= window.end; minute += length) {
                const time = day.getTime() + minute * MINUTE_MS - EAT_OFFSET_MS;
                if (time >= earliest && !takenTimes.has(time) && !isBusy(time)) slots.push(new Date(time));
            }
        }
    }

    return slots.sort((a, b) => a - b);
}
