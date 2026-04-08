export const EXCLUDE_NAMES = ['test', 'samual', 'jay', 'diag', 'agent', 'fix'];

export const isTestAccount = (guest_name: string, voucher_code: string) => {
  const n = String(guest_name || '').toLowerCase();
  const c = String(voucher_code || '').toLowerCase();
  if (c.startsWith('test-')) return true;

  // Exact whole-word matching for 'jay' and 'samual'
  return EXCLUDE_NAMES.some(tn => {
    if (tn === 'jay' || tn === 'samual') {
      const regex = new RegExp(`\\b${tn}\\b`, 'i');
      return regex.test(n);
    }
    return n.includes(tn);
  });
};

export const getCategoryStrict = (serviceStr: string, explicitCategory?: string) => {
  if (explicitCategory && explicitCategory !== 'other' && explicitCategory !== 'reception') return explicitCategory;

  const s = String(serviceStr || '').toLowerCase().trim();
  if (s.includes('t store') || s.includes('shopping')) return 'fashion';
  if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'hair';
  return 'wellness';
};
