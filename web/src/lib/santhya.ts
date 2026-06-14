// Bani references for the Santhya collections. Ang numbers are well-attested
// (Japji 1, Rehras/Sodar 8, Kirtan Sohila 12, Baavan Akhri 250, Sukhmani 262,
// Asa Ki Vaar 462, Anand Sahib 917, Dakhni Oankaar 929, Sidh Gosht 938; Jaap
// Sahib opens the Dasam Granth at 1). Items with an href open the reader.
export const REF: Record<string, { gur: string; en: string; href?: string }> = {
  japji: { gur: 'ਜਪੁ ਜੀ ਸਾਹਿਬ', en: 'Japji Sahib', href: '/santhiya?src=sggs&ang=1' },
  jaap: { gur: 'ਜਾਪੁ ਸਾਹਿਬ', en: 'Jaap Sahib', href: '/santhiya?src=dasam&ang=1' },
  savaiye: { gur: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸ੍ਵਯੇ', en: 'Tav Prasad Savaiye', href: '/santhiya?src=dasam&ang=1' },
  chaupai: { gur: 'ਬੇਨਤੀ ਚੌਪਈ', en: 'Benti Chaupai', href: '/santhiya?src=dasam&ang=1' },
  anand: { gur: 'ਅਨੰਦੁ ਸਾਹਿਬ', en: 'Anand Sahib', href: '/santhiya?src=sggs&ang=917' },
  rehras: { gur: 'ਰਹਰਾਸਿ ਸਾਹਿਬ', en: 'Rehras Sahib', href: '/santhiya?src=sggs&ang=8' },
  sohila: { gur: 'ਕੀਰਤਨ ਸੋਹਿਲਾ', en: 'Kirtan Sohila', href: '/santhiya?src=sggs&ang=12' },
  sukhmani: { gur: 'ਸੁਖਮਨੀ ਸਾਹਿਬ', en: 'Sukhmani Sahib', href: '/santhiya?src=sggs&ang=262' },
  asadivar: { gur: 'ਆਸਾ ਕੀ ਵਾਰ', en: 'Asa Ki Vaar', href: '/santhiya?src=sggs&ang=462' },
  'baavan-akhri': { gur: 'ਬਾਵਨ ਅਖਰੀ', en: 'Baavan Akhri', href: '/santhiya?src=sggs&ang=250' },
  'sidh-gosht': { gur: 'ਸਿਧ ਗੋਸਟਿ', en: 'Sidh Gosht', href: '/santhiya?src=sggs&ang=938' },
  'dakhni-oankaar': { gur: 'ਦਖਣੀ ਓਅੰਕਾਰੁ', en: 'Dakhni Oankaar', href: '/santhiya?src=sggs&ang=929' },
  // Das Granthi — ten baanis of the DASAM GRANTH (standard Dasam Granth Angs).
  'd-jaap': { gur: 'ਜਾਪੁ ਸਾਹਿਬ', en: 'Jaap Sahib', href: '/santhiya?src=dasam&ang=1' },
  'd-akal-ustat': { gur: 'ਅਕਾਲ ਉਸਤਤਿ', en: 'Akal Ustat', href: '/santhiya?src=dasam&ang=11' },
  'd-bachittar-natak': { gur: 'ਬਚਿਤ੍ਰ ਨਾਟਕ', en: 'Bachittar Natak', href: '/santhiya?src=dasam&ang=39' },
  'd-chandi-charitar-1': { gur: 'ਚੰਡੀ ਚਰਿਤ੍ਰ ਉਕਤਿ ਬਿਲਾਸ', en: 'Chandi Charitar (Ukti Bilas)', href: '/santhiya?src=dasam&ang=74' },
  'd-chandi-charitar-2': { gur: 'ਚੰਡੀ ਚਰਿਤ੍ਰ', en: 'Chandi Charitar II', href: '/santhiya?src=dasam&ang=99' },
  'd-chandi-di-vaar': { gur: 'ਚੰਡੀ ਦੀ ਵਾਰ', en: 'Chandi di Vaar', href: '/santhiya?src=dasam&ang=119' },
  'd-gyan-prabodh': { gur: 'ਗਿਆਨ ਪ੍ਰਬੋਧ', en: 'Gyan Prabodh', href: '/santhiya?src=dasam&ang=127' },
  'd-chaubis-avtar': { gur: 'ਚੌਬੀਸ ਅਵਤਾਰ', en: 'Chaubis Avtar', href: '/santhiya?src=dasam&ang=155' },
  'd-shastar-naam-mala': { gur: 'ਸ਼ਸਤ੍ਰ ਨਾਮ ਮਾਲਾ', en: 'Shastar Naam Mala', href: '/santhiya?src=dasam&ang=717' },
  'd-zafarnama': { gur: 'ਜ਼ਫ਼ਰਨਾਮਾ', en: 'Zafarnama', href: '/santhiya?src=dasam&ang=1389' },
  // Panj Granthavali — non-Gurbani granths (no read-along text available).
  'chanakya-niti': { gur: 'ਚਾਣਕਯ ਨੀਤੀ', en: 'Chanakya Niti', href: '/course/chanakya-niti' },
  sarkutavali: { gur: 'ਸਾਰੁਕਤਾਵਲੀ', en: 'Sarukatavali', href: '/course/sarukatavali' },
  bhavrasamrit: { gur: 'ਭਾਵਰਸਾਮ੍ਰਿਤ', en: 'Bhavrasamrit', href: '/course/bhavrasamrit' },
  'vichar-mala': { gur: 'ਵਿਚਾਰ ਮਾਲਾ', en: 'Vichar Mala', href: '/course/vichar-mala' },
  'adhyatam-prakash': { gur: 'ਅਧਯਾਤਮ ਪ੍ਰਕਾਸ਼', en: 'Adhyatam Prakash', href: '/course/mahant-ganesha-singh' },
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
    blurb: 'Ten baanis of the Dasam Granth — the compositions associated with Guru Gobind Singh Ji.',
    note: 'Das Granthi is a Dasam Granth collection (not SGGS). Exact selections vary by edition; a common set is shown, opening in the Dasam Granth reader.',
    groups: [{ t: 'The ten (Dasam Granth)', items: ['d-jaap', 'd-akal-ustat', 'd-bachittar-natak', 'd-chandi-charitar-1', 'd-chandi-charitar-2', 'd-chandi-di-vaar', 'd-gyan-prabodh', 'd-chaubis-avtar', 'd-shastar-naam-mala', 'd-zafarnama'] }],
  },
  'panj-granthavali': {
    name: 'Panj Granthavali', gur: 'ਪੰਜ ਗ੍ਰੰਥਾਵਲੀ',
    blurb: 'A collection of five non-Gurbani granths — philosophical and niti (ethical-political) compositions.',
    note: 'These are non-Gurbani works (placed last); each now opens as a study course drawn from its traditional teeka.',
    groups: [{ t: 'The five', items: ['chanakya-niti', 'sarkutavali', 'bhavrasamrit', 'vichar-mala', 'adhyatam-prakash'] }],
  },
};
