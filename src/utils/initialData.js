export const INITIAL_APPROVED = [
  {
    email: 'test@hackdays.io',
    name: 'Tech Team Test',
    team: 'Tech Team',
    college: 'NMAMIT',
    usn: '4NM23CS001',
    phone: '+91 98765 43210'
  },
  {
    email: 'nnm24cs047@nmamit.in',
    name: 'Aryan Verma',
    team: 'Team',
    college: 'NMAMIT',
    usn: 'NNM24CS047',
    phone: ''
  },
  {
    email: 'nnm24is285@nmamit.in',
    name: 'Vivian',
    team: 'Niggas',
    college: 'NMAMIT',
    usn: 'NNM24IS285',
    phone: '9876540321'
  },
  {
    email: 'nnm24is270@nmamit.in',
    name: 'Vaishak',
    team: 'Niggas',
    college: 'NMAMIT',
    usn: 'NNM24IS270',
    phone: '9876504321'
  },
  {
    email: 'rahul.sharma@nmamit.in',
    name: 'Rahul Sharma',
    team: 'Byte Busters',
    college: 'NMAMIT',
    usn: '4NM23CS101',
    phone: ''
  },
  {
    email: 'ananya.rao@nmamit.in',
    name: 'Ananya Rao',
    team: 'Byte Busters',
    college: 'NMAMIT',
    usn: '4NM23CS102',
    phone: ''
  },
  {
    email: 'aditya.p@nmamit.in',
    name: 'Aditya Prabhu',
    team: 'Binary Hawks',
    college: 'NMAMIT',
    usn: '4NM23EC041',
    phone: ''
  },
  {
    email: 'sneha.h@nmamit.in',
    name: 'Sneha Hegde',
    team: 'Binary Hawks',
    college: 'NMAMIT',
    usn: '4NM23EC042',
    phone: ''
  },
  {
    email: 'kiran.k@nmamit.in',
    name: 'Kiran Kumar',
    team: 'Algo Knights',
    college: 'NMAMIT',
    usn: '4NM23IS015',
    phone: ''
  },
  {
    email: 'rohan.n@nmamit.in',
    name: 'Rohan Nayak',
    team: 'Algo Knights',
    college: 'NMAMIT',
    usn: '4NM23IS016',
    phone: ''
  },
  {
    email: 'arjun.pai@nmamit.in',
    name: 'Arjun Pai',
    team: 'Code Wizards',
    college: 'NMAMIT',
    usn: '4NM23AI008',
    phone: ''
  },
  {
    email: 'divya.s@nmamit.in',
    name: 'Divya Shetty',
    team: 'Code Wizards',
    college: 'NMAMIT',
    usn: '4NM23AI009',
    phone: ''
  }
];

export function getSafeLocalStorage(key, fallback = []) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) && parsed.length === 0 ? fallback : parsed;
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
