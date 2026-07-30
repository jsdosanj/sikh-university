// Professor bio strings — kept separate from data.ts so pages that only need
// a bio (e.g. admin.astro's client script) don't pull in the multi-megabyte
// courses.json/professors.json that data.ts imports.

export const PROF_BIOS: Record<string, string> = {
  'Bhai Jasvant Singh ਪੰਛੀ': 'Bhai Jasvant Singh ਪੰਛੀ is a Sikh educator and pracharik who founded Sikhi University. In 2023–2024, he led a global Amrit Sanchar lehar through which thousands reconnected with the path of the Guru. He has traveled the world doing parchar, guided by a simple vision: that every person, regardless of background, deserves to build their own personal, intimate relationship with Waheguru.',
  'Sikhi University': 'Sikhi University is a free, open online university. These original courses are drafted with AI and reviewed for accuracy, offering a welcoming way for anyone, anywhere to begin learning about Sikhi and modern skills.',
  'Prof. Sahib Singh': 'Prof. Sahib Singh (1892-1977) was a towering Sikh scholar and grammarian, best known for his ten-volume exegesis Sri Guru Granth Sahib Darpan and his pioneering work on Gurbani grammar (Gurbani Viakaran).',
  'Bhai Vir Singh': 'Bhai Vir Singh (1872-1957) is regarded as the father of modern Punjabi literature and a leading figure of the Singh Sabha renaissance.',
  'Bhai Kahn Singh Nabha': 'Bhai Kahn Singh Nabha (1861-1938) was a great Sikh encyclopedist, author of the monumental Mahan Kosh and the tract Ham Hindu Nahin.',
  'Giani Sant Singh Maskeen': 'Giani Sant Singh Maskeen (1934-2005) was among the most beloved Sikh katha-vachaks, known for clear, profound discourses on Gurbani and Gurmat.',
  'Bhai Randhir Singh': 'Bhai Randhir Singh (1878-1961) was a Sikh freedom fighter and devotee renowned for his writings on Naam practice and his memoir Jail Chithian.',
  'Dr. Darshan Singh': 'Dr. Darshan Singh is a scholar of Sikh philosophy and religion whose academic work examines Gurmat thought and the Sikh tradition.',
  'Bhai Gurdas': "Bhai Gurdas (c.1551-1636) was the scribe of the Adi Granth and a foundational interpreter of Gurbani; his Vaaran are called the 'key' to Sikh scripture.",
  'Bhai Nand Lal': "Bhai Nand Lal 'Goya' (1633-1713) was a celebrated Persian and Punjabi poet of Guru Gobind Singh Ji's court.",
  'Giani Gian Singh': 'Giani Gian Singh (1822-1921) was a Sikh historian and chronicler, author of Twarikh Guru Khalsa and Panth Prakash.',
  'Max Arthur Macauliffe': 'Max Arthur Macauliffe (1841-1913) produced the six-volume The Sikh Religion in close consultation with Sikh scholars.',
  'Kavi Santokh Singh': 'Kavi Santokh Singh (1787-1843) was a major Sikh poet-historian, author of Sri Gur Pratap Suraj Granth and Nanak Prakash.',
  'Dr. Ganda Singh': 'Dr. Ganda Singh (1900-1987) was a pioneering Sikh historian whose rigorous, source-based works shaped modern Sikh history.',
  'W.H. McLeod': 'W. H. McLeod (1932-2009) was an influential Western scholar of Sikh studies.',
  'Pyara Singh Padam': 'Pyara Singh Padam (1922-2001) was a prolific scholar and editor of Punjabi and Sikh literature, history and rehat traditions.',
  'Bhai Sohan Singh Sital': 'Bhai Sohan Singh Sital (1909-1998) was a noted dhadi, novelist and historian of the Sikh misls and Sikh rule.',
  'Giani Ditt Singh': 'Giani Ditt Singh (1850-1901) was a leading Singh Sabha reformer, writer and editor.',
  'Bhai Joginder Singh Talwara': 'Bhai Joginder Singh Talwara is a respected Gurbani scholar known for works on Gurbani grammar and correct recitation.',
  'Sant Waryam Singh Ratwara Sahib': 'Sant Waryam Singh Ji (Ratwara Sahib) is a contemporary Sikh spiritual teacher known for discourses on Naam, meditation and Gurmat spirituality.',
  'Sant Seva Singh Rampur Khera': 'Sant Baba Seva Singh Ji (Rampur Khera) is known for large-scale kar seva, tree-planting and humanitarian service rooted in the Sikh ideal of seva.',
  'Bhai Chaupa Singh': 'Bhai Chaupa Singh Chhibber (17th-18th century) is associated with an early Rehatnama, a foundational text of the Sikh code of conduct.',
  'Nikky-Guninder Kaur Singh': 'Nikky-Guninder Kaur Singh is a leading scholar of Sikhism, known for her work on gender and the feminine in the Sikh tradition and for translations of Sikh scripture.',
  'Patwant Singh': 'Patwant Singh (1925-2009) was a writer on Sikh heritage and history, author of The Golden Temple and The Sikhs.',
  'W.G. Archer': "W. G. Archer (1907-1979) was a curator and art historian whose Paintings of the Sikhs documented the Sikh visual tradition.",
  'Bhai Avtar Singh': 'Bhai Avtar Singh (1925-2006) was a renowned exponent of Gurmat Sangeet who preserved and documented the traditional raags of Gurbani Kirtan.',
  'Pal Singh Purewal': 'Pal Singh Purewal is a scholar of calendrics, best known for designing the Nanakshahi calendar used for dating Sikh observances.',
  'Sikh Archive': 'The Sikh Archive (sikharchive.net) is a digital library and educational initiative; its free foundational and AI courses are shared here as a partner.',
};
export function profBio(name: string): string { return PROF_BIOS[name] || ''; }
