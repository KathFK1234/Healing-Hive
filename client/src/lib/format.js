// Dates are always shown in East Africa Time, whatever the device is set to,
// because sessions are booked against Kenyan working hours.
const TIME_ZONE = 'Africa/Nairobi';

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true });
const dateFormat = new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
const longDateFormat = new Intl.DateTimeFormat('en-KE', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// "2026-10-06" for the EAT calendar day a moment falls on
export const localDay = (date) => dayKey.format(new Date(date));

// Some browsers write the en-KE day period in lower case; keep it consistent.
export const formatTime = (date) => timeFormat.format(new Date(date)).replace(/\s?(am|pm)$/i, (match) => ` ${match.trim().toUpperCase()}`);
export const formatDate = (date) => dateFormat.format(new Date(date));
export const formatLongDate = (date) => longDateFormat.format(new Date(date));

// "Today", "Tomorrow", "Yesterday" or "Tue, 6 Oct"
export function formatDay(date) {
  const today = localDay(Date.now());
  const day = localDay(date);
  if (day === today) return 'Today';
  if (day === localDay(Date.now() + 86400000)) return 'Tomorrow';
  if (day === localDay(Date.now() - 86400000)) return 'Yesterday';
  return formatDate(date);
}

export const formatDateTime = (date) => `${formatDay(date)} at ${formatTime(date)}`;

export function formatMoney(amount, currency = 'KES') {
  if (!amount) return 'Free';
  return `${currency === 'KES' ? 'KSh' : currency} ${Number(amount).toLocaleString('en-KE')}`;
}

// Minutes after midnight <-> "HH:MM", for <input type="time">
export function minutesToClock(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function clockToMinutes(clock) {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

export function formatClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function firstName(fullName = '') {
  return fullName.trim().split(/\s+/)[0] || 'friend';
}

export function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
