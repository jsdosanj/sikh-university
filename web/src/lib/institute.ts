// Institute of Technology — content access. Companion to lib/data.ts.
// The manifest is the spine; lesson bodies + dojo scripts load lazily at
// runtime (from R2 via /media/institute/… in prod, /data/institute/… in dev —
// wired in Wave 4). Nothing here pulls a lesson body at build time.
import manifest from '../data/institute/manifest.json';
import professorsRaw from '../data/institute/professors.json';

export type TrackKind = 'phase' | 'dojo' | 'guide' | 'capstone';
export type TrackStatus = 'planned' | 'draft' | 'published';

export interface Track {
  id: string;
  kind: TrackKind;
  source: 'aisf' | 'sikhi.io' | 'ours';
  title: string;
  summary: string;
  level: number;
  prereq: string | null;
  status: TrackStatus;
  license: string;
  professor: string;
  num?: number;
  slug?: string;
  lessonCount?: number;
  topicCount?: number;
  projectCount?: number;
  engine?: 'terminal' | 'dojo';
}

export interface Booth {
  id: string;
  title: string;
  kind: 'booth';
  href: string;
  wave: string;
  blurb: string;
}

export interface InstituteProfessor {
  name: string;
  kind: 'person' | 'org';
  role: string;
  bio: string;
  links: { label: string; href: string }[];
  license: string;
}

export const WEDGE: string = (manifest as any).wedge;
export const SHIP_SHAPE: string = (manifest as any).shipShape;
export const tracks: Track[] = (manifest as any).tracks;
export const explore: Booth[] = (manifest as any).explore;
export const deferred = (manifest as any).deferred as {
  phases: string[];
  atlas: string;
  booths: string[];
};
export const professors: Record<string, InstituteProfessor> = professorsRaw as any;

export const phases = tracks.filter((t) => t.kind === 'phase').sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
export const dojos = tracks.filter((t) => t.kind === 'dojo');
export const guides = tracks.filter((t) => t.kind === 'guide');
export const capstones = tracks.filter((t) => t.kind === 'capstone');

export const trackById = (id: string): Track | undefined => tracks.find((t) => t.id === id);
export const professorOf = (t: Track): InstituteProfessor | undefined => professors[t.professor];

/** Route slug for a track's overview page: /institute/track/<slug>. */
export const trackSlug = (t: Track): string =>
  t.kind === 'phase' && t.slug ? t.slug : t.id;

/** Total planned lessons across the built spine (for the "N lessons" copy). */
export const totalLessons: number = phases.reduce((n, p) => n + (p.lessonCount ?? 0), 0);
