// Crisis contacts for Kenya. Kept in the app itself (not fetched) so the help
// page works even when the server is down. The server has a matching list in
// server/src/utils/crisis.js: keep the two in step, and re-check the numbers
// before every release.
export const CRISIS_CONTACTS = [
  { name: 'Emergency services', phone: '999', note: 'Police, ambulance and fire. 112 also works from mobile phones.' },
  { name: 'Kenya Red Cross', phone: '1199', note: 'Toll-free counselling and emergency line.' },
  { name: 'Befrienders Kenya', phone: '+254 722 178 177', note: 'Confidential emotional support for people in distress.' },
  { name: 'GBV helpline', phone: '1195', note: 'Toll-free support for gender-based violence, any hour.' },
  { name: 'Childline Kenya', phone: '116', note: 'Toll-free helpline for children and young people.' },
];

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;
