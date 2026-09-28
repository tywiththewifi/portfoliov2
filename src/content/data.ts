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
  { slug: 'project-one', title: 'Project One', year: '2026', role: 'Design + Build', blurb: 'Two or three lines about the project: the problem, what you made, and the result. A number or a quote from the client goes a long way here.', tags: ['Web', 'WebGL', 'Motion'], hue: 18 },
  { slug: 'project-two', title: 'Project Two', year: '2025', role: 'Product Design', blurb: 'Two or three lines about the project: the problem, what you made, and the result. A number or a quote from the client goes a long way here.', tags: ['App', 'iOS', 'Design system'], hue: 172 },
  { slug: 'project-three', title: 'Project Three', year: '2025', role: 'Creative Dev', blurb: 'Two or three lines about the project: the problem, what you made, and the result. A number or a quote from the client goes a long way here.', tags: ['Music', 'Audio', 'Tools'], hue: 38 },
  { slug: 'project-four', title: 'Project Four', year: '2024', role: 'Brand + Web', blurb: 'Two or three lines about the project: the problem, what you made, and the result. A number or a quote from the client goes a long way here.', tags: ['Brand', 'Identity', 'Web'], hue: 330 },
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
  { title: 'Design', body: 'Interfaces, systems and prototypes, from first sketch to shipped pixels.', icon: 'pencil', items: ['Product & UI design', 'Design systems', 'Prototypes'] },
  { title: 'Develop', body: 'WebGL, motion and interactive sites that people remember.', icon: 'monitor', items: ['Creative development', 'WebGL & 3D', 'Front-end builds'] },
  { title: 'Brand', body: 'Visual identities with a point of view, built to live on screens.', icon: 'star', items: ['Identity & logo', 'Art direction', 'Print & zines'] },
  { title: 'Sound', body: 'Beats, sound design and audio for products and film.', icon: 'wave', items: ['Beats & scoring', 'Sound design', 'Sonic branding'] },
] as const;

export const projectIcons = ['monitor', 'camera', 'note', 'star', 'gear', 'book'] as const;
