export const getSafeTopic = (topic) => {
  const clean = (topic || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const whitelist = [
    'fractions', 'linear_equations', 'geometry', 'algebra', 'decimals', 'percentage',
    'bruchrechnung', 'gleichungen', 'geometrie', 'prozentsatz', 'dezimalzahlen',
    'physics', 'chemistry', 'biology', 'history', 'english', 'physik', 'chemie', 'biologie', 'geschichte'
  ];
  return whitelist.includes(clean) ? clean : 'general_curriculum';
};

export const escapeXML = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
