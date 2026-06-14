// Bani references for the Santhya collections. Ang numbers are well-attested
// (Japji 1, Rehras/Sodar 8, Kirtan Sohila 12, Baavan Akhri 250, Sukhmani 262,
// Asa Ki Vaar 462, Anand Sahib 917, Dakhni Oankaar 929, Sidh Gosht 938; Jaap
// Sahib opens the Dasam Granth at 1). Items with an href open the reader.
export const REF: Record<string, { gur: string; en: string; href?: string }> = {
  japji: { gur: 'ਜਪੁ ਜੀ ਸਾਹਿਬ', en: 'Japji Sahib', href: '/read?src=sggs&ang=1' },
  jaap: { gur: 'ਜਾਪੁ ਸਾਹਿਬ', en: 'Jaap Sahib', href: '/read?src=dasam&ang=1' },
  savaiye: { gur: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸ੍ਵਯੇ', en: 'Tav Prasad Savaiye', href: '/read?src=dasam&ang=1' },
  chaupai: { gur: 'ਬੇਨਤੀ ਚੌਪਈ', en: 'Benti Chaupai', href: '/read?src=dasam&ang=1' },
  anand: { gur: 'ਅਨੰਦੁ ਸਾਹਿਬ', en: 'Anand Sahib', href: '/read?src=sggs&ang=917' },
  rehras: { gur: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', en: 'Rehras Sahib', href: '/read?src=sggs&ang=8' },
  sohila: { gur: 'ਕੀਰਤਨ ਸੋਹਿਲਾ', en: 'Kirtan Sohila', href: '/read?src=sggs&ang=12' },
  sukhmani: { gur: 'ਸੁਖਮਨੀ ਸਾਹਿਬ', en: 'Sukhmani Sahib', href: '/read?src=sggs&ang=262' },
  asadivar: { gur: 'ਆਸਾ ਕੀ ਵਾਰ', en: 'Asa Ki Vaar', href: '/read?src=sggs&ang=462' },
  'baavan-akhri': { gur: 'ਬਾਵਨ ਅਖਰੀ', en: 'Baavan Akhri', href: '/read?src=sggs&ang=250' },
  'sidh-gosht': { gur: 'ਸਿਧ ਗੋਸਟਿ', en: 'Sidh Gosht', href: '/read?src=sggs&ang=938' },
  'dakhni-oankaar': { gur: 'ਦਖਣੀ ਓਅੰਕਾਰੁ', en: 'Dakhni Oankaar', href: '/read?src=sggs&ang=929' },
  // Panj Granthavali — non-Gurbani granths (no read-along text available).
  'chanakya-niti': { gur: 'ਚਾਣਕਯ ਨੀਤੀ', en: 'Chanakya Niti' },
  sarkutavali: { gur: 'ਸਾਰੁਕਤਾਵਲੀ', en: 'Sarukatavali' },
  bhavrasamrit: { gur: 'ਭਾਵਰਸਾਮ੍ਰਿਤ', en: 'Bhavrasamrit' },
  'vichar-mala': { gur: 'ਵਿਚਾਰ ਮਾਲਾ', en: 'Vichar Mala' },
  'adhyatam-prakash': { gur: 'ਅਧਯਾਤਮ ਪ੍ਰਕਾਸ਼', en: 'Adhyatam Prakash' },
};

export type Collection = { name: string; gur: string; blurb: string; note?: string; groups: { t: string; items: string[] }[] };

export const COLLECTIONS: Record<string, Collection> = {
  nitnem: {
    name: 'Nitnem', gur: 'ਨਿਤਨੇਮ',
    blurb: 'The daily banis — the foundation of a Sikh reading practice, read morning, evening and night.',
    groups: [
      { t: 'Amrit Vela (morning)', items: ['japji', 'jaap', 'savaiye', 'chaupai', 'anand'] },
      { t: 'Evening', items: ['rehras'] },
      { t: 'Night (before sleep)', items: ['sohila'] },
    ],
  },
  'sundar-gutka': {
    name: 'Sundar Gutka', gur: 'ਸੁੰਦਰ ਗੁਟਕਾ',
    blurb: 'The common collection of daily and occasional banis.',
    note: 'Exact contents vary by edition; the major banis are linked here.',
    groups: [
      { t: 'Daily', items: ['japji', 'jaap', 'savaiye', 'chaupai', 'anand', 'rehras', 'sohila'] },
      { t: 'Major banis', items: ['sukhmani', 'asadivar'] },
    ],
  },
  'panj-granthi': {
    name: 'Panj Granthi', gur: 'ਪੰਜ ਗ੍ਰੰਥੀ',
    blurb: 'Five longer baanis of Sri Guru Granth Sahib Ji — a step up in santhya practice.',
    groups: [{ t: 'The five', items: ['sukhmani', 'asadivar', 'baavan-akhri', 'sidh-gosht', 'dakhni-oankaar'] }],
  },
  'das-granthi': {
    name: 'Das Granthi', gur: 'ਦਸ ਗ੍ਰੰਥੀ',
    blurb: 'Ten selected baanis — fuller santhya before the complete Granth.',
    note: 'Selections vary by edition; a common set is shown.',
    groups: [{ t: 'The ten', items: ['japji', 'jaap', 'anand', 'rehras', 'sohila', 'sukhmani', 'asadivar', 'baavan-akhri', 'sidh-gosht', 'dakhni-oankaar'] }],
  },
  'panj-granthavali': {
    name: 'Panj Granthavali', gur: 'ਪੰਜ ਗ੍ਰੰਥਾਵਲੀ',
    blurb: 'A collection of five non-Gurbani granths — philosophical and niti (ethical-political) compositions.',
    note: 'These are non-Gurbani works, included for completeness; read-along text is not provided.',
    groups: [{ t: 'The five', items: ['chanakya-niti', 'sarkutavali', 'bhavrasamrit', 'vichar-mala', 'adhyatam-prakash'] }],
  },
};
