import * as THREE from 'three';
import gsap from 'gsap';
import type { Hero, HotspotId } from '../hero';
import { blip } from '../audio';
import { mountDeskOS } from './deskos';

type Actions = Partial<Record<HotspotId, () => void>>;

// Hover/click on objects in the 3D room, plus an accessible button for each.
export function setupInteraction(hero: Hero, stage: HTMLElement, actions: Actions) {
  const { view, hotspots } = hero;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: HotspotId | null = null;
  let focused: HotspotId | null = null;
  let zoomed = false;
  let busy = false;

  // tooltip
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('aria-hidden', 'true');
  stage.appendChild(tip);

  // keyboard / screen-reader access: one real button per object
  const list = document.createElement('div');
  list.className = 'hotspot-list';
  list.setAttribute('aria-label', 'Things on the desk');
  for (const h of hotspots) {
    const b = document.createElement('button');
    b.className = 'sr-btn';
    b.textContent = h.id === 'lamp' ? 'Lamp: press Enter to switch, arrow keys to aim' : `${h.label}: ${h.hint}`;
    b.addEventListener('focus', () => { focused = h.id; });
    b.addEventListener('blur', () => { if (focused === h.id) focused = null; });
    b.addEventListener('click', () => activate(h.id));
    if (h.id === 'lamp') b.addEventListener('keydown', (e) => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] };
      if (d[e.key]) { e.preventDefault(); hero.aimLamp(...d[e.key]); }
    });
    list.appendChild(b);
  }
  stage.appendChild(list);

  const pick = (clientX: number, clientY: number): HotspotId | null => {
    const r = view.canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, view.camera);
    let best: { id: HotspotId; d: number } | null = null;
    for (const h of hotspots) {
      const hit = ray.intersectObject(h.object, true)[0];
      if (hit && (!best || hit.distance < best.d)) best = { id: h.id, d: hit.distance };
    }
    return best?.id ?? null;
  };

  let down: { x: number; y: number; t: number } | null = null;
  stage.addEventListener('pointermove', (e) => {
    if (zoomed || busy) return;
    if (e.pointerType === 'mouse') hovered = pick(e.clientX, e.clientY);
  });
  stage.addEventListener('pointerleave', () => { hovered = null; });
  // Dragging the lamp aims it; everything else is click-to-open.
  let lampDrag: { x: number; y: number; moved: boolean } | null = null;
  stage.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!zoomed && !busy && pick(e.clientX, e.clientY) === 'lamp') {
      lampDrag = { x: e.clientX, y: e.clientY, moved: false };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('dragging');
      e.preventDefault();
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!lampDrag) return;
    const r = stage.getBoundingClientRect();
    const dx = (e.clientX - lampDrag.x) / r.width, dy = (e.clientY - lampDrag.y) / r.height;
    if (Math.hypot(e.clientX - down!.x, e.clientY - down!.y) > 6) lampDrag.moved = true;
    hero.aimLamp(dx, dy);
    lampDrag.x = e.clientX;
    lampDrag.y = e.clientY;
  });
  const endDrag = (e: PointerEvent) => {
    if (!lampDrag) return false;
    const moved = lampDrag.moved;
    lampDrag = null;
    stage.classList.remove('dragging');
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    if (!moved) activate('lamp');
    down = null;
    return true;
  };
  stage.addEventListener('pointercancel', (e) => endDrag(e));
  stage.addEventListener('pointerup', (e) => {
    if (endDrag(e)) return;
    if (!down || zoomed || busy) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 10) return;
    if ((e.target as HTMLElement).closest('button, a, .os')) return;
    const id = pick(e.clientX, e.clientY);
    if (id) activate(id);
  });

  function activate(id: HotspotId) {
    blip(660);
    if (id === 'computer') openComputer();
    else actions[id]?.();
  }

  // ---------------------------------------------------------------- CRT zoom
  const overlay = document.createElement('div');
  overlay.className = 'screen-overlay';
  stage.appendChild(overlay);
  let unmount: (() => void) | null = null;

  const corners = () => {
    const c = hero.computer.screenCenter, s = hero.computer.screenSize;
    const a = view.toScreen(c.clone().add(new THREE.Vector3(-s.w / 2, s.h / 2, 0)));
    const b = view.toScreen(c.clone().add(new THREE.Vector3(s.w / 2, -s.h / 2, 0)));
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };

  function openComputer() {
    if (zoomed || busy) return;
    busy = true;
    hovered = null;
    document.documentElement.classList.add('os-open');
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gsap.to(view.rig, {
      zoom: 1, duration: 1.2, ease: 'power3.inOut',
      onComplete: () => {
        zoomed = true;
        busy = false;
        unmount = mountDeskOS(overlay, closeComputer);
        overlay.classList.add('on');
      },
    });
  }

  function closeComputer() {
    if (!zoomed || busy) return;
    busy = true;
    overlay.classList.remove('on');
    setTimeout(() => {
      unmount?.();
      unmount = null;
      gsap.to(view.rig, {
        zoom: 0, duration: 1, ease: 'power3.inOut',
        onComplete: () => {
          zoomed = false;
          busy = false;
          document.documentElement.classList.remove('os-open');
          (list.firstElementChild as HTMLElement)?.focus({ preventScroll: true });
        },
      });
    }, 200);
  }

  // ---------------------------------------------------------------- per frame
  view.onTick(() => {
    const active = zoomed || busy ? null : focused ?? hovered;
    for (const h of hotspots) h.target = h.id === active ? 1 : 0;
    stage.style.cursor = zoomed ? '' : hovered === 'lamp' ? 'grab' : hovered ? 'pointer' : '';

    if (active) {
      const h = hotspots.find((x) => x.id === active)!;
      const p = view.toScreen(h.anchor());
      tip.innerHTML = `<b>${h.label}</b><span>${h.hint}</span>`;
      tip.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
      tip.classList.add('on');
    } else tip.classList.remove('on');

    if (zoomed) {
      const r = corners();
      overlay.style.left = `${r.x}px`;
      overlay.style.top = `${r.y}px`;
      overlay.style.width = `${r.w}px`;
      overlay.style.height = `${r.h}px`;
    }
  });

  return { openComputer, closeComputer, isZoomed: () => zoomed };
}
