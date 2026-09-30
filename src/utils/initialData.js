export const INITIAL_APPROVED = [
  {
    email: 'test@hackdays.io',
    name: 'Tech Team Test',
    team: 'Tech Team',
    college: 'NMAMIT',
    usn: '4NM23CS001',
    phone: '+91 98765 43210'
  }
];

export function getSafeLocalStorage(key, fallback = []) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setSafeLocalStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Storage write failed (e.g. private mode)', e);
  }
}
