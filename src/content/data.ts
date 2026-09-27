// Placeholder content. Swap these out for real projects, books, photos and copy.

export type Project = {
  slug: string;
  title: string;
  year: string;
  role: string;
  blurb: string;
  tags: string[];
  hue: number; // placeholder thumbnail colour
  url?: string;
};

export const site = {
  name: 'Your Name',
  handle: 'yourname',
  email: 'hello@yourname.dev',
  tagline: 'Designer & developer building interfaces that feel like places.',
  location: 'Somewhere, Earth',
  socials: [
    { label: 'GitHub', href: '#' },
    { label: 'LinkedIn', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Read.cv', href: '#' },
  ],
};

export const projects: Project[] = [
  { slug: 'project-one', title: 'Project One', year: '2026', role: 'Design + Build', blurb: 'A short line about what this project is and why it mattered.', tags: ['Web', 'WebGL'], hue: 8 },
  { slug: 'project-two', title: 'Project Two', year: '2025', role: 'Product Design', blurb: 'A short line about what this project is and why it mattered.', tags: ['App', 'iOS'], hue: 170 },
  { slug: 'project-three', title: 'Project Three', year: '2025', role: 'Creative Dev', blurb: 'A short line about what this project is and why it mattered.', tags: ['Music', 'Audio'], hue: 38 },
  { slug: 'project-four', title: 'Project Four', year: '2024', role: 'Brand + Web', blurb: 'A short line about what this project is and why it mattered.', tags: ['Brand', 'Web'], hue: 330 },
  { slug: 'project-five', title: 'Project Five', year: '2024', role: 'Engineering', blurb: 'A short line about what this project is and why it mattered.', tags: ['Tools', 'Node'], hue: 200 },
  { slug: 'project-six', title: 'Project Six', year: '2023', role: 'Art Direction', blurb: 'A short line about what this project is and why it mattered.', tags: ['Print', 'Zine'], hue: 95 },
];

export const books = [
  { title: 'Book Title One', author: 'Author Name', color: '#c9483a' },
  { title: 'Book Title Two', author: 'Author Name', color: '#3a6ea5' },
  { title: 'Book Title Three', author: 'Author Name', color: '#e8c35a' },
  { title: 'Book Title Four', author: 'Author Name', color: '#2f6b4f' },
  { title: 'Book Title Five', author: 'Author Name', color: '#8a4fa0' },
  { title: 'Book Title Six', author: 'Author Name', color: '#e07a4f' },
  { title: 'Book Title Seven', author: 'Author Name', color: '#1f3a5a' },
  { title: 'Book Title Eight', author: 'Author Name', color: '#b8a07a' },
];

export const photos = Array.from({ length: 8 }, (_, i) => ({
  caption: `Photo ${String(i + 1).padStart(3, '0')}`,
  date: `2026.0${(i % 9) + 1}.1${i}`,
  hue: (i * 47 + 10) % 360,
}));

export const services = [
  { title: 'Product & UI Design', body: 'Interfaces, systems and prototypes, from first sketch to shipped pixels.' },
  { title: 'Creative Development', body: 'WebGL, motion and interactive sites that people remember.' },
  { title: 'Brand & Identity', body: 'Visual identities with a point of view, built to live on screens.' },
  { title: 'Music & Sound', body: 'Beats, sound design and audio for products and film.' },
];
