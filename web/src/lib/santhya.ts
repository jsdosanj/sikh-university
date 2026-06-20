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
  // ── Historical Chronicles ────────────────────────────────────────────────
  'suraj-prakash': { gur: 'ਸੂਰਜ ਪ੍ਰਕਾਸ਼', en: 'Suraj Prakash Granth', href: 'https://sikharchive.net/reader?book=suraj-granth' },
  'sri-nanak-prakash': { gur: 'ਸ੍ਰੀ ਨਾਨਕ ਪ੍ਰਕਾਸ਼', en: 'Sri Nanak Prakash', href: 'https://sikharchive.net/reader?book=sri-nanak-prakash' },
  'gurbilas-6': { gur: 'ਗੁਰਬਿਲਾਸ ਪਾਤਸ਼ਾਹੀ ੬', en: 'Gurbilas Patshahi 6', href: 'https://sikharchive.net/reader?book=gurbilas-patshahi-6' },
  'gurbilas-10': { gur: 'ਗੁਰਬਿਲਾਸ ਪਾਤਸ਼ਾਹੀ ੧੦', en: 'Gurbilas Patshahi 10', href: 'https://sikharchive.net/reader?book=gurbilas-patshahi-10' },
  'panth-prakash': { gur: 'ਪੰਥ ਪ੍ਰਕਾਸ਼', en: 'Panth Prakash (Gian Singh)', href: 'https://sikharchive.net/reader?book=panth-prakash' },
  bansavalinama: { gur: 'ਬੰਸਾਵਲੀਨਾਮਾ', en: 'Bansavalinama Dasan Patshahian Ka', href: 'https://sikharchive.net/reader?book=chhibber-bansavalinama-1769' },
  'twarikh-guru-khalsa': { gur: 'ਤਵਾਰੀਖ਼ ਗੁਰੂ ਖ਼ਾਲਸਾ', en: 'Twarikh Guru Khalsa (Gian Singh — Full)', href: 'https://sikharchive.net/reader?book=gian-singh-twarikh-guru-khalsa' },
  // ── Spiritual Commentaries ───────────────────────────────────────────────
  'vaaran-bhai-gurdas': { gur: 'ਵਾਰਾਂ ਭਾਈ ਗੁਰਦਾਸ', en: 'Vaaran Bhai Gurdas (Mool Paath)', href: 'https://sikharchive.net/reader?book=bhai-gurdas-ji-s-vaaran-mool-paath' },
  'vaaran-bhai-gurdas-steek': { gur: 'ਵਾਰਾਂ ਭਾਈ ਗੁਰਦਾਸ (ਟੀਕਾ ਭਾਈ ਵੀਰ ਸਿੰਘ)', en: 'Vaaran Bhai Gurdas — Steek by Bhai Vir Singh', href: 'https://sikharchive.net/reader?book=bhai-gurdas-dian-vaaran-di-steek-by-bhai-vir-singh-gurmatveechar-com' },
  'kabitt-savaiye': { gur: 'ਕਬਿੱਤ ਸਵੱਯੇ ਭਾਈ ਗੁਰਦਾਸ', en: 'Kabitt Savaiye Bhai Gurdas (Steek)', href: 'https://sikharchive.net/reader?book=kabitt-sawaiye-gurdas-ji-steek-ii' },
  'kulliyat-bhai-nand-lal': { gur: 'ਕੁੱਲੀਆਤ ਭਾਈ ਨੰਦ ਲਾਲ', en: 'Kulliyat-e-Bhai Nand Lal', href: 'https://sikharchive.net/reader?book=kulliyat-e-bhai-nand-lal' },
  'ganj-namah': { gur: 'ਗੰਜ ਨਾਮਾ (ਭਾਈ ਨੰਦ ਲਾਲ)', en: 'Ganj Namah — Bhai Nand Lal', href: 'https://sikharchive.net/reader?book=ganj-namah-by-bhai-nand-lal-ji' },
  'faridkot-teeka': { gur: 'ਫਰੀਦਕੋਟ ਵਾਲਾ ਟੀਕਾ', en: 'Faridkot Wala Teeka (SGGS Commentary)', href: 'https://sikharchive.net/reader?book=faridkot-wala-teeka' },
  'guru-granth-darpan': { gur: 'ਗੁਰੂ ਗ੍ਰੰਥ ਦਰਪਣ', en: 'Guru Granth Darpan', href: 'https://sikharchive.net/reader?book=guru-granth-darpan' },
  // ── Political & Governance ───────────────────────────────────────────────
  hukamnamme: { gur: 'ਹੁਕਮਨਾਮੇ ਗੁਰੂ ਸਾਹਿਬਾਨ', en: 'Hukamnamas — Letters of the Gurus', href: 'https://sikharchive.net/reader?book=hukamnamme-guru-sahebaan' },
  // ── Rehat, Ethics & Social ───────────────────────────────────────────────
  rahitnama: { gur: 'ਰਹਿਤਨਾਮਾ', en: 'Rahitnama', href: 'https://sikharchive.net/reader?book=rahitnama' },
  'rehatnama-chaupa-singh': { gur: 'ਰਹਿਤਨਾਮਾ ਭਾਈ ਚਉਪਾ ਸਿੰਘ', en: 'Rehatnama — Bhai Chaupa Singh', href: 'https://sikharchive.net/reader?book=rehatnama-bhai-chaupa-singh' },
  'rehat-maryada': { gur: 'ਸਿੱਖ ਰਹਿਤ ਮਰਯਾਦਾ', en: 'Sikh Rehat Maryada (Punjabi)', href: 'https://sikharchive.net/reader?book=rehat-maryada-punjabi' },
  tankhahnama: { gur: 'ਤਨਖਾਹਨਾਮਾ', en: 'Tankhahnama', href: 'https://sikharchive.net/reader?book=tankhahnama' },
  'prem-sumarag': { gur: 'ਪ੍ਰੇਮ ਸੁਮਾਰਗ', en: 'Prem Sumarag Granth', href: 'https://sikharchive.net/reader?book=prem-sumarag' },
  // ── Bhagti Abhyas — Meditation & Contemplation ──────────────────────────
  'bhagti-intro': { gur: 'ਭਗਤੀ ਦੀ ਨੀਂਹ', en: 'The Foundation of Bhagti', href: '/course/bhagti-foundation' },
  'naam-simran-guide': { gur: 'ਨਾਮ ਸਿਮਰਨ ਅਭਿਆਸ', en: 'Naam Simran — A Practical Guide', href: '/course/naam-simran' },
  'anhad-naad': { gur: 'ਅਨਹਦ ਨਾਦ', en: 'Anhad Naad — The Unstruck Sound', href: '/course/bhai-randhir-singh-anhad-shabad' },
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
  'bhagti-abhyas': {
    name: 'Bhagti Abhyas', gur: 'ਭਗਤੀ ਅਭਿਆਸ',
    blurb: 'Simran, meditation and contemplation — the foundation of the Sikh jeevan. Without Bhagti, all knowledge is empty.',
    note: 'Gurbani is clear: ਗਿਆਨੀ ਭੂਲੇ ਬਿਨੁ ਭਗਤੀ ਅਭਿਮਾਨੀ — the learned without devotion are only arrogant. Begin here.',
    groups: [
      { t: 'The Foundation (Naam Simran)', items: ['japji', 'sukhmani', 'anand'] },
      { t: 'Practice Guides', items: ['bhagti-intro', 'naam-simran-guide', 'anhad-naad'] },
    ],
  },
  'historical-chronicles': {
    name: 'Historical Chronicles', gur: 'ਇਤਿਹਾਸਕ ਗ੍ਰੰਥ',
    blurb: 'The great historical works documenting the lives of the Gurus, the Khalsa, and the Sikh Panth.',
    note: 'These open in the Sikh Archive reader. Full page content may be in progress for some works.',
    groups: [
      { t: 'Lives of the Gurus', items: ['suraj-prakash', 'sri-nanak-prakash', 'gurbilas-6', 'gurbilas-10'] },
      { t: 'Panth History', items: ['panth-prakash', 'twarikh-guru-khalsa', 'bansavalinama'] },
    ],
  },
  'spiritual-commentaries': {
    name: 'Spiritual Commentaries', gur: 'ਅਧਿਆਤਮਕ ਟੀਕੇ',
    blurb: 'Deep Sikh theological writing — Vaaran Bhai Gurdas, Bhai Nand Lal, and the great teekas of the Guru Granth Sahib.',
    groups: [
      { t: 'Bhai Gurdas', items: ['vaaran-bhai-gurdas', 'vaaran-bhai-gurdas-steek', 'kabitt-savaiye'] },
      { t: 'Bhai Nand Lal', items: ['kulliyat-bhai-nand-lal', 'ganj-namah'] },
      { t: 'SGGS Teekas', items: ['faridkot-teeka', 'guru-granth-darpan'] },
    ],
  },
  'political-governance': {
    name: 'Political & Governance Texts', gur: 'ਰਾਜਨੀਤਕ ਗ੍ਰੰਥ',
    blurb: 'Primary sources on Sikh political vision — Hukamnamas from the Gurus and the Zafarnama.',
    groups: [
      { t: 'The Gurus' Letters', items: ['hukamnamme'] },
      { t: 'Guru Gobind Singh (Dasam Granth)', items: ['d-zafarnama'] },
    ],
  },
  'rehat-ethics': {
    name: 'Rehat & Ethics', gur: 'ਰਹਿਤ ਅਤੇ ਨੈਤਿਕਤਾ',
    blurb: 'The Sikh codes of conduct, discipline, and social ethics — from the historical Rehatnamas to Prem Sumarag.',
    groups: [
      { t: 'Historical Rehatnamas', items: ['rahitnama', 'rehatnama-chaupa-singh'] },
      { t: 'Codes of Conduct', items: ['rehat-maryada', 'tankhahnama'] },
      { t: 'Social Ethics', items: ['prem-sumarag'] },
    ],
  },
};
