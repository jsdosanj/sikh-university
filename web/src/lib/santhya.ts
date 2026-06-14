// Bani references for the Santhya collections. Ang numbers are well-attested
// (Japji 1, Rehras/Sodar 8, Kirtan Sohila 12, Sukhmani 262, Asa Ki Vaar 462,
// Anand Sahib 917; Jaap Sahib opens the Dasam Granth at 1). Links open the reader.
export const REF: Record<string, { gur: string; en: string; href: string }> = {
  japji: { gur: 'ਜਪੁ ਜੀ ਸਾਹਿਬ', en: 'Japji Sahib', href: '/read?src=sggs&ang=1' },
  jaap: { gur: 'ਜਾਪੁ ਸਾਹਿਬ', en: 'Jaap Sahib', href: '/read?src=dasam&ang=1' },
  savaiye: { gur: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸ੍ਵਯੇ', en: 'Tav Prasad Savaiye', href: '/read?src=dasam&ang=1' },
  chaupai: { gur: 'ਬੇਨਤੀ ਚੌਪਈ', en: 'Benti Chaupai', href: '/read?src=dasam&ang=1' },
  anand: { gur: 'ਅਨੰਦੁ ਸਾਹਿਬ', en: 'Anand Sahib', href: '/read?src=sggs&ang=917' },
  rehras: { gur: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', en: 'Rehras Sahib', href: '/read?src=sggs&ang=8' },
  sohila: { gur: 'ਕੀਰਤਨ ਸੋਹਿਲਾ', en: 'Kirtan Sohila', href: '/read?src=sggs&ang=12' },
  sukhmani: { gur: 'ਸੁਖਮਨੀ ਸਾਹਿਬ', en: 'Sukhmani Sahib', href: '/read?src=sggs&ang=262' },
  asadivar: { gur: 'ਆਸਾ ਕੀ ਵਾਰ', en: 'Asa Ki Vaar', href: '/read?src=sggs&ang=462' },
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
    blurb: 'Five selected baanis — a step up in santhya practice.',
    note: 'Selections vary by edition; a common set is shown.',
    groups: [{ t: 'The five', items: ['japji', 'jaap', 'anand', 'sukhmani', 'sohila'] }],
  },
  'panj-granthavali': {
    name: 'Panj Granthavali', gur: 'ਪੰਜ ਗ੍ਰੰਥਾਵਲੀ',
    blurb: 'A wider selection of baanis for continued santhya practice.',
    note: 'Selections vary by edition; a common set is shown.',
    groups: [{ t: 'Selection', items: ['japji', 'jaap', 'savaiye', 'chaupai', 'anand', 'rehras', 'sohila'] }],
  },
  'das-granthi': {
    name: 'Das Granthi', gur: 'ਦਸ ਗ੍ਰੰਥੀ',
    blurb: 'Ten selected baanis — fuller santhya before the complete Granth.',
    note: 'Selections vary by edition; a common set is shown.',
    groups: [{ t: 'The ten', items: ['japji', 'jaap', 'savaiye', 'chaupai', 'anand', 'rehras', 'sohila', 'sukhmani', 'asadivar'] }],
  },
};
