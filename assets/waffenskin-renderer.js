import { skinDefinition } from './waffenskin-katalog.js';

function seededRandom(id) {
  let seed = 2166136261;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function patternGrid({ radius, step }, draw) {
  for (let y = -radius; y < radius; y += step) {
    for (let x = -radius; x < radius; x += step) draw(x, y);
  }
}

function polygon(ctx, points, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) ctx.stroke();
}

function circle(ctx, x, y, size, fill) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  } else ctx.stroke();
}

const motifs = {
  bands(ctx, { radius, step, skin }) {
    for (let x = -radius; x < radius; x += step * 2) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(x, -radius, step * skin.width, radius * 2);
      ctx.fillStyle = skin.highlight;
      ctx.fillRect(x + step * (skin.width + .1), -radius, Math.max(1, step * .03), radius * 2);
    }
  },
  chips(ctx, area) {
    const { step, random, skin } = area;
    patternGrid(area, (x, y) => {
      const a = x + random() * step;
      const b = y + random() * step;
      const s = step * (.16 + random() * .36);
      polygon(ctx, [[a, b], [a + s * .92, b - s * .39], [a + s, b + s * .42], [a - s * .18, b + s]], random() < .33 ? skin.highlight : skin.color);
    });
  },
  grid(ctx, { radius, step, skin }) {
    ctx.lineWidth = 1.6;
    for (let i = -radius; i < radius; i += step) {
      ctx.strokeStyle = skin.color;
      ctx.beginPath();
      ctx.moveTo(i, -radius);
      ctx.lineTo(i, radius);
      ctx.stroke();
      ctx.strokeStyle = skin.highlight;
      ctx.globalAlpha = .56;
      ctx.beginPath();
      ctx.moveTo(-radius, i);
      ctx.lineTo(radius, i);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
  checks(ctx, area) {
    const { radius, step, skin, random } = area;
    patternGrid(area, (x, y) => {
      const col = Math.round((x + radius) / step);
      const row = Math.round((y + radius) / step);
      if ((col + row) % 2 !== 0) return;
      ctx.fillStyle = random() < .27 ? skin.highlight : skin.color;
      ctx.fillRect(x, y, step * .92, step * .92);
    });
  },
  flecks(ctx, area) {
    const { random, step, skin } = area;
    patternGrid(area, (x, y) => {
      circle(ctx, x + random() * step, y + random() * step, .75 + random() * step * .15,
        random() < .42 ? skin.highlight : skin.color);
    });
  },
  edges(ctx, { width, height, step, skin }) {
    ctx.strokeStyle = skin.color;
    ctx.lineWidth = step * .43;
    ctx.strokeRect(-width * .49, -height * .44, width * .98, height * .88);
    ctx.strokeStyle = skin.highlight;
    ctx.lineWidth = Math.max(1.4, step * .07);
    ctx.strokeRect(-width * .40, -height * .33, width * .80, height * .66);
    for (const x of [-.25, .04, .33]) {
      polygon(ctx, [[width * x, -height * .43], [width * x + step, -height * .43],
        [width * x - step, height * .35], [width * x - step * 1.7, height * .35]], skin.color);
    }
  },
  brush(ctx, { radius, step, random, skin }) {
    for (let y = -radius; y < radius; y += Math.max(2, step * .21)) {
      const x = (random() * 2 - 1) * radius;
      ctx.globalAlpha = .13 + random() * .50;
      ctx.fillStyle = random() < .34 ? skin.highlight : skin.color;
      ctx.fillRect(x - radius * .55, y, radius * (.48 + random() * .90), 1 + random() * 1.6);
    }
    ctx.globalAlpha = 1;
  },
  patina(ctx, { width, height, step, random, skin }) {
    for (let i = 0; i < 32; i++) {
      const x = (random() - .5) * width;
      const y = (random() - .5) * height;
      const size = step * (.7 + random() * 2);
      const cloud = ctx.createRadialGradient(x, y, size * .12, x, y, size);
      cloud.addColorStop(0, (random() < .32 ? skin.highlight : skin.color) + 'bc');
      cloud.addColorStop(1, skin.color + '00');
      ctx.fillStyle = cloud;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }
  },
  iridescent(ctx, { width, height, skin }) {
    const shine = ctx.createLinearGradient(-width * .5, -height * .4, width * .5, height * .4);
    shine.addColorStop(0, skin.base);
    shine.addColorStop(.3, skin.highlight);
    shine.addColorStop(.48, skin.color);
    shine.addColorStop(.69, skin.highlight);
    shine.addColorStop(1, skin.color);
    ctx.fillStyle = shine;
    ctx.fillRect(-width, -height, width * 2, height * 2);
  },
  machined(ctx, area) {
    const { step, skin } = area;
    ctx.strokeStyle = skin.color;
    ctx.lineWidth = 1.4;
    patternGrid(area, (x, y) => {
      circle(ctx, x + step * .5, y + step * .5, step * .34);
      circle(ctx, x + step * .5, y + step * .5, step * .18, skin.highlight + '88');
    });
  },
  facets(ctx, area) {
    const { step, random, skin } = area;
    ctx.strokeStyle = skin.highlight + 'b5';
    ctx.lineWidth = 1;
    patternGrid(area, (x, y) => {
      const a = x + step * (.22 + random() * .5);
      const b = y + step * (.23 + random() * .5);
      polygon(ctx, [[x, y], [x + step, y], [a, b]], skin.color + 'cf', true);
      polygon(ctx, [[x + step, y + step], [x, y + step], [a, b]], skin.highlight + '69', true);
    });
  },
  waves(ctx, { height, step, radius, skin }) {
    for (let i = 0; i < skin.count; i++) {
      const y = -height * .62 + (i * height * 1.24) / skin.count;
      ctx.beginPath();
      for (let x = -radius; x <= radius; x += 4) {
        const wave = Math.sin(x / (step * 2) + i * .27) * step * .64;
        ctx.lineTo(x, y + wave);
      }
      ctx.strokeStyle = i % 3 === 0 ? skin.highlight : skin.color;
      ctx.lineWidth = Math.min(step * (i % 3 === 0 ? .25 : .10), height / 12);
      ctx.stroke();
    }
  },
  aurora(ctx, { radius, width, height, skin }) {
    const veil = ctx.createLinearGradient(0, -height * .68, 0, height * .68);
    veil.addColorStop(0, skin.base);
    veil.addColorStop(.36, skin.highlight);
    veil.addColorStop(.64, skin.color);
    veil.addColorStop(1, skin.base);
    ctx.fillStyle = veil;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeStyle = skin.highlight + '68';
    ctx.lineWidth = height * .11;
    ctx.beginPath();
    ctx.moveTo(-radius, height * .31);
    ctx.bezierCurveTo(-width * .28, -height * .69, width * .14, height * .66, radius, -height * .28);
    ctx.stroke();
  },
  cracks(ctx, area) {
    const { step, random, skin } = area;
    ctx.strokeStyle = skin.highlight;
    ctx.lineWidth = 1.55;
    patternGrid(area, (x, y) => {
      const elbow = x + step * (.2 + random() * .7);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(elbow, y + step * .44);
      ctx.lineTo(x + step, y + step);
      ctx.moveTo(elbow, y + step * .44);
      ctx.lineTo(x + step, y);
      ctx.stroke();
    });
  },
  contours(ctx, { width, height, step, skin }) {
    for (let i = 0; i < 9; i++) {
      const size = step * (1 + i * .83);
      ctx.strokeStyle = i % 3 === 0 ? skin.highlight : skin.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(-width * .27, height * .03, size * 1.7, size * .82, i * .06, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  rings(ctx, { width, height, step, skin }) {
    for (let i = 0; i < skin.count; i++) {
      const size = step * (.7 + i * .67);
      ctx.strokeStyle = i % 2 === 0 ? skin.highlight : skin.color;
      ctx.lineWidth = step * (.10 + (i % 2) * .085);
      circle(ctx, width * .17, -height * .11, size);
      circle(ctx, -width * .33, height * .27, size * .80);
    }
  },
  circuits(ctx, area) {
    const { step, random, skin } = area;
    ctx.strokeStyle = skin.color;
    ctx.lineWidth = 2;
    patternGrid(area, (x, y) => {
      if (random() > .63) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + step * .59, y);
      ctx.lineTo(x + step * .59, y - step * .45);
      ctx.lineTo(x + step, y - step * .45);
      ctx.stroke();
      circle(ctx, x + step, y - step * .45, 2.3, skin.highlight);
    });
  },
  blocks(ctx, area) {
    const { step, random, skin } = area;
    patternGrid(area, (x, y) => {
      if (random() < .31) return;
      ctx.fillStyle = random() < .37 ? skin.highlight : skin.color;
      const cells = Math.floor(random() * 3) + 1;
      ctx.fillRect(x, y, (step * cells) / 2, step * (.28 + random() * .65));
    });
  },
  hexagons(ctx, area) {
    const { radius, step, skin, random } = area;
    ctx.strokeStyle = skin.highlight + 'a0';
    ctx.lineWidth = 1.3;
    for (let col = 0, x = -radius; x < radius; col++, x += step * 1.5) {
      for (let y = -radius; y < radius; y += step * Math.sqrt(3)) {
        const cy = y + (col % 2) * step * Math.sqrt(3) / 2;
        const points = Array.from({ length: 6 }, (_, index) => {
          const angle = index * Math.PI / 3;
          return [x + Math.cos(angle) * step, cy + Math.sin(angle) * step];
        });
        polygon(ctx, points, random() < .32 ? skin.color : '', true);
      }
    }
  },
  dots(ctx, area) {
    const { step, random, skin } = area;
    patternGrid(area, (x, y) => circle(ctx, x, y, step * (.12 + random() * .17), random() < .46 ? skin.highlight : skin.color));
  },
  panels(ctx, { radius, step, skin }) {
    for (let x = -radius; x < radius; x += step * 3.2) {
      ctx.fillStyle = skin.color;
      ctx.fillRect(x, -radius, step * 1.26, radius * 2);
      ctx.fillStyle = skin.highlight;
      ctx.fillRect(x + step * 1.26, -radius, step * .64, radius * 2);
      ctx.fillStyle = skin.base;
      ctx.fillRect(x + step * .08, step * .74, step * 2.4, step * .26);
    }
  },
  scan(ctx, { radius, step, skin, random }) {
    for (let y = -radius; y < radius; y += step * .34) {
      ctx.strokeStyle = random() < .34 ? skin.highlight : skin.color;
      ctx.lineWidth = .9 + random() * 1.8;
      ctx.setLineDash([step * 1.5, step * .45]);
      ctx.lineDashOffset = -random() * step * 2;
      ctx.beginPath();
      ctx.moveTo(-radius, y);
      ctx.lineTo(radius, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  },
  bark(ctx, area) {
    const { step, skin, random } = area;
    patternGrid(area, (x, y) => {
      ctx.fillStyle = random() < .55 ? skin.highlight : skin.color;
      ctx.fillRect(x, y + random() * step * .9, step * (.55 + random() * 1.10), .8 + random() * step * .10);
    });
  },
  stars(ctx, { width, height, skin, random, step }) {
    for (let i = 0; i < 70; i++) {
      const x = (random() - .5) * width;
      const y = (random() - .5) * height;
      const size = step * (.036 + random() * .083);
      circle(ctx, x, y, size, i % 3 ? skin.highlight : skin.color);
      if (i % 7 === 0) {
        ctx.fillRect(x - size * 2.5, y - .6, size * 5, 1.2);
        ctx.fillRect(x - .6, y - size * 2.5, 1.2, size * 5);
      }
    }
  },
  craters(ctx, area) {
    const { step, skin, random } = area;
    patternGrid(area, (x, y) => {
      const size = step * (.16 + random() * .28);
      circle(ctx, x + 1.5, y + 2.8, size, skin.highlight + 'ad');
      circle(ctx, x, y, size, skin.color);
      circle(ctx, x - 1.3, y - 1.8, size * .66, skin.base + 'b0');
    });
  },
  comets(ctx, area) {
    const { step, random, skin } = area;
    patternGrid(area, (x, y) => {
      if (random() < .65) return;
      const end = x + step * 2.8;
      const trail = ctx.createLinearGradient(x, y, end, y);
      trail.addColorStop(0, skin.color + '00');
      trail.addColorStop(.85, skin.color);
      trail.addColorStop(1, skin.highlight);
      ctx.fillStyle = trail;
      ctx.fillRect(x, y, end - x, step * .13);
      circle(ctx, end, y + step * .06, step * .16, skin.highlight);
    });
  },
  swirls(ctx, { width, height, step, skin }) {
    for (let i = -4; i < 5; i++) {
      const x = i * step * 2.28;
      ctx.strokeStyle = i % 2 === 0 ? skin.highlight : skin.color;
      ctx.lineWidth = step * (i % 2 === 0 ? .15 : .32);
      ctx.beginPath();
      ctx.moveTo(x - width * .45, -height * .52);
      ctx.bezierCurveTo(x + step * 5, -height * .75, x - step * 4, height * .24, x + width * .35, height * .64);
      ctx.stroke();
    }
  },
  hatch(ctx, area) {
    const { step, skin, random } = area;
    patternGrid(area, (x, y) => {
      ctx.fillStyle = random() < .31 ? skin.highlight : skin.color;
      ctx.fillRect(x, y + step * random(), step * (1 + random()), 1.2);
      ctx.fillRect(x + 3, y + 4, step * .83, 1.4);
    });
  },
  brushstrokes(ctx, { width, height, step, skin }) {
    for (let y = -height * .55, i = 0; y < height * .75; y += step * .9, i++) {
      ctx.strokeStyle = i % 3 === 0 ? skin.highlight : skin.color;
      ctx.lineWidth = step * (i % 2 === 0 ? .46 : .21);
      ctx.beginPath();
      ctx.moveTo(-width, y);
      ctx.quadraticCurveTo(-width * .06, y - height * .42, width * .30, y - step * .24);
      ctx.quadraticCurveTo(width * .45, y + step * .1, width, y - height * .16);
      ctx.stroke();
    }
  },
};

function drawTexture(ctx, bounds, skin) {
  const { width, height, left, top } = bounds;
  ctx.save();
  ctx.translate(left + width / 2, top + height / 2);
  ctx.rotate((skin.angle || 0) * Math.PI / 180);
  const radius = Math.ceil(Math.hypot(width, height) / 2);
  const background = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  background.addColorStop(0, skin.color);
  background.addColorStop(.25, skin.base);
  background.addColorStop(.70, skin.base);
  background.addColorStop(1, skin.color);
  ctx.fillStyle = background;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  motifs[skin.pattern](ctx, {
    width, height, radius, skin,
    step: Math.max(10, height * .115) * skin.scale,
    random: seededRandom(skin.id),
  });
  ctx.restore();
}

const sourceCache = new Map();
const renderCache = new Map();

function cached(cache, key, limit, create) {
  if (cache.has(key)) {
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }
  const value = create();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

function canvas(width, height) {
  const node = document.createElement('canvas');
  node.width = width;
  node.height = height;
  return node;
}

function opaqueBounds(pixels, width, height) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] < 126) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right >= left ? { left, top, width: right - left + 1, height: bottom - top + 1 } : null;
}

async function surface(source) {
  const image = new Image();
  if (/^https?:/i.test(source)) image.crossOrigin = 'anonymous';
  image.src = source;
  await image.decode();
  const scale = Math.min(1, 1100 / image.naturalWidth, 630 / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const ctx = canvas(width, height).getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const bounds = opaqueBounds(pixels.data, width, height);
  return { width, height, pixels, bounds };
}

async function paintSkin(source, skin) {
  const { width, height, pixels, bounds } = await cached(sourceCache, source, 8, () => surface(source));
  if (!bounds) return source;
  const output = canvas(width, height);
  const ctx = output.getContext('2d', { willReadFrequently: true });
  drawTexture(ctx, bounds, skin);
  const color = ctx.getImageData(0, 0, width, height).data;
  const result = new Uint8ClampedArray(pixels.data);
  for (let index = 0; index < result.length; index += 4) {
    const alpha = result[index + 3];
    if (alpha === 0) continue;
    const light = result[index] * .2126 + result[index + 1] * .7152 + result[index + 2] * .0722;
    const shade = .35 + .95 * Math.pow(light / 255, .74);
    const reflection = Math.max(0, light - 158) * .34;
    const coverage = (.45 + .45 * Math.min(1, light / 62)) * (color[index + 3] / 255);
    for (let channel = 0; channel < 3; channel++) {
      const tone = color[index + channel] * shade + reflection;
      result[index + channel] += (tone - result[index + channel]) * coverage;
    }
  }
  ctx.putImageData(new ImageData(result, width, height), 0, 0);
  return output.toDataURL('image/webp', .93);
}

export function skinnedImageSource(source, id) {
  const skin = skinDefinition(id);
  if (!source || !skin) return Promise.resolve(source);
  const key = id + '\n' + source;
  return cached(renderCache, key, 28, () => paintSkin(source, skin).catch(() => source));
}

const seenImages = new WeakSet();
const observers = new WeakMap();

function setSkinImage(img) {
  if (seenImages.has(img)) return;
  seenImages.add(img);
  const source = img.getAttribute('src');
  skinnedImageSource(source, img.dataset.weaponSkin).then((result) => {
    if (result !== source && img.isConnected && img.getAttribute('src') === source) img.src = result;
  });
}

export function renderWeaponSkins(root, lazy = false) {
  if (!root) return;
  observers.get(root)?.disconnect();
  const images = root.querySelectorAll('img[data-weapon-skin]');
  if (!images.length) return;
  if (!lazy || typeof IntersectionObserver !== 'function') {
    images.forEach(setSkinImage);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      setSkinImage(entry.target);
    }
  }, { rootMargin: '240px' });
  observers.set(root, observer);
  for (const image of images) if (!seenImages.has(image)) observer.observe(image);
}
