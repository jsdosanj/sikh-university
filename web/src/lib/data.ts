// Single source of content: the same courses.json the Worker serves.
import raw from '../../../site/assets/data/courses.json';
import photos from '../../../site/assets/data/professors.json';

export type Term = { t: string; m: string };
export type Lesson = { title: string; summary?: string; html: string };
export type Quiz = { q: string; options: string[]; answer: number };
export type Course = {
  id: string; title: string; topic: string; level: number; professor: string;
  source?: string; aiCreated?: boolean; status: string; summary: string;
  outcomes?: string[]; terms?: Term[]; references?: string[];
  lessons?: Lesson[]; quiz?: Quiz[];
  sourceText?: { work: string; url: string; gurmukhi?: string; english?: string };
};
export type Topic = { id: string; name: string; blurb: string };
export type Path = { id: string; name: string; blurb: string; courseIds: string[] };

export const courses: Course[] = (raw as any).courses;
export const topics: Topic[] = (raw as any).topics;
export const paths: Path[] = (raw as any).paths || [];
export const professorPhotos: Record<string, { img: string; credit?: string; source?: string }> = photos as any;

export const published = courses.filter((c) => c.status === 'published');

export function topicName(id: string): string {
  const t = topics.find((x) => x.id === id);
  return t ? t.name : id;
}

export const TOPIC_ICONS: Record<string, string> = {
  theology: '🪔', philosophy: '💭', history: '📜', literature: '📖', language: '✍️',
  spirituality: '🧘', music: '🎵', arts: '🎨', 'modern-skills': '🤖', reference: '📚',
  ethics: '⚖️', rehat: '🪯', comparative: '🌍',
};

export function professorList() {
  const map: Record<string, Course[]> = {};
  for (const c of courses) (map[c.professor] = map[c.professor] || []).push(c);
  return Object.keys(map)
    .sort((a, b) => (a === 'Sikh University' ? 1 : b === 'Sikh University' ? -1 : map[b].length - map[a].length))
    .map((name) => ({ name, courses: map[name] }));
}

const TITLES = /^(Prof\.|Dr\.|Bhai|Giani|Sant|Baba|Mahant|Pandit|Kavi|Swami|Sodhi|Subedar|Raja|Mata)\s+/i;
export function profInitials(name: string): string {
  const p = name.replace(TITLES, '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
const AV_PALETTE = ['#16335c', '#1d4e89', '#2f7d4f', '#8a5a14', '#5c3b8a', '#0f2547'];
export function avatarColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AV_PALETTE[h % AV_PALETTE.length];
}

export const PROF_BIOS: Record<string, string> = {
  'Sikh University': 'Sikh University is a free, open online university. These original courses are drafted with AI and reviewed for accuracy, offering a welcoming way for anyone, anywhere to begin learning about Sikhi and modern skills.',
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

export function profSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function professorBySlug(slug: string): string | undefined {
  return professorList().map((p) => p.name).find((n) => profSlug(n) === slug);
}
