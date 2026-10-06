// Crisis contacts for Kenya, ordered so the lines that answer at any hour come
// first. Last checked against each organisation's published details in
// October 2026. Kept in the app itself (not fetched) so the help page works
// even when the server is down. The server has a matching list in
// server/src/utils/crisis.js: keep the two in step, and re-check the numbers
// before every release.
export const CRISIS_CONTACTS = [
  { name: 'Emergency services', phone: '999', hours: 'Any time', note: 'Police, ambulance and fire. 112 also works from mobile phones.' },
  { name: 'Kenya Red Cross', phone: '1199', hours: 'Any time, free', note: 'Free counselling by phone, day or night.' },
  { name: 'GBV helpline', phone: '1195', hours: 'Any time, free', note: 'Support for anyone facing sexual or gender-based violence.' },
  { name: 'Child helpline', phone: '116', hours: 'Any time, free', note: 'For children and young people. Also on WhatsApp: 0722 116 116.' },
  { name: 'Befrienders Kenya', phone: '+254 722 178 177', hours: 'Weekdays, 9am to 5pm', note: 'Confidential emotional support by call, SMS or WhatsApp.' },
];

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;
