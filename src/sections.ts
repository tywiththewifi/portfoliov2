import { POSTERS, poster, type PosterId } from './art/posters';
import { Pix } from './art/pix';
import { rng } from './art/posters';
import { projects, services, site } from './content/data';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

function posterEl(id: PosterId, k: number, small: boolean) {
  const meta = POSTERS.find((p) => p.id === id)!;
  const fig = document.createElement('figure');
  fig.className = 'poster';
  const R = rng(k * 13 + id.length);
  fig.style.setProperty('--rot', `${((R() - 0.5) * (small ? 6 : 9)).toFixed(1)}deg`);
  const c = document.createElement('canvas');
  const src = poster(id);
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  c.className = 'px';
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', `Pixel poster: ${meta.label}`);
  fig.appendChild(c);
  fig.insertAdjacentHTML('beforeend', '<span class="tape" aria-hidden="true"></span>');
  return fig;
}

function workThumb(hue: number, k: number) {
  const g = new Pix(96, 60);
  const R = rng(900 + k);
  g.grad(0, 0, 96, 60, [hsl(hue, 45, 16), hsl(hue + 25, 55, 32), hsl(hue + 40, 60, 46)]);
  for (let i = 0; i < 6; i++) {
    const w = 10 + Math.floor(R() * 30), h = 6 + Math.floor(R() * 18);
    g.r(Math.floor(R() * (96 - w)), Math.floor(R() * (60 - h)), w, h, hsl(hue + i * 28, 70, 50 + i * 5));
  }
  g.dens(0, 0, 96, 60, '#000000', 0.08);
  return g.canvas.toDataURL();
}

export function mountSections() {
  document.querySelectorAll<HTMLElement>('[data-posters]').forEach((wrap, w) => {
    const small = wrap.hasAttribute('data-small');
    (wrap.dataset.posters ?? '').split(' ').filter(Boolean).forEach((id, k) => wrap.appendChild(posterEl(id as PosterId, w * 10 + k, small)));
  });

  const work = document.getElementById('workList')!;
  projects.forEach((p, k) => {
    const li = document.createElement('li');
    li.className = 'work-item';
    li.innerHTML = `
      <a href="#top" data-open-work>
        <img class="px" src="${workThumb(p.hue, k)}" alt="" />
        <span class="wi-n pix">${String(k + 1).padStart(2, '0')}</span>
        <span class="wi-t">${p.title}</span>
        <span class="wi-m">${p.role}</span>
        <span class="wi-tags pix">${p.tags.join(' · ')}</span>
        <span class="wi-y pix">${p.year}</span>
      </a>`;
    work.appendChild(li);
  });

  const sv = document.getElementById('serviceList')!;
  const svPosters: PosterId[] = ['cube', 'keys', 'crown', 'drum'];
  services.forEach((s, k) => {
    const li = document.createElement('li');
    li.className = 'service';
    li.appendChild(posterEl(svPosters[k % svPosters.length], 40 + k, true));
    li.insertAdjacentHTML('beforeend', `<span class="sv-n pix">0${k + 1}</span><h3>${s.title}</h3><p>${s.body}</p>`);
    sv.appendChild(li);
  });

  const mail = document.getElementById('mailLink') as HTMLAnchorElement;
  mail.href = `mailto:${site.email}`;
  mail.innerHTML = `${site.email} <span class="pix">↗</span>`;
  document.getElementById('socials')!.innerHTML = site.socials.map((s) => `<li><a class="pix" href="${s.href}">${s.label}</a></li>`).join('');
  document.getElementById('year')!.textContent = String(new Date().getFullYear());
  document.getElementById('factLocation')!.textContent = site.location;
  document.querySelectorAll('[data-name]').forEach((el) => (el.textContent = site.name));
}
