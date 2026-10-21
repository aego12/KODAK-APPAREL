function updateHeroScale() {
  document.documentElement.style.setProperty('--hero-scale', Math.min(window.innerWidth / 1920, 1));
}

const intro = document.querySelector('.intro');
if (intro) {
  for (const element of document.body.children) {
    if (element !== intro) element.inert = true;
  }
  intro.focus({ preventScroll: true });
}

const navigation = document.querySelector('.nav');
if (navigation) {
  let lastScrollY = window.scrollY;
  let navFrame = 0;
  const updateNavigation = () => {
    navFrame = 0;
    const currentY = window.scrollY;
    const direction = currentY - lastScrollY;
    if (Math.abs(direction) < 5 && currentY > 32) return;
    if (currentY <= 32 || navigation.contains(document.activeElement)) {
      navigation.classList.remove('is-hidden');
    } else if (direction > 0) {
      navigation.classList.add('is-hidden');
    } else if (direction < 0) {
      navigation.classList.remove('is-hidden');
    }
    lastScrollY = currentY;
  };
  window.addEventListener('scroll', () => {
    if (!navFrame) navFrame = requestAnimationFrame(updateNavigation);
  }, { passive: true });
  navigation.addEventListener('focusin', () => navigation.classList.remove('is-hidden'));
}

async function drawHeroOnce() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) {
    hero.classList.add('hero--draw-complete');
    return;
  }
  const animations = [];
  const finish = () => {
    hero.classList.add('hero--draw-complete');
    animations.forEach((animation) => animation.cancel());
  };
  const onMotionChange = () => { if (motion.matches) finish(); };
  motion.addEventListener('change', onMotionChange);
  try {
    // Wait for the original textured artwork before revealing its individual strokes.
    await Promise.all([...hero.querySelectorAll('.hero__mark image')].map((element) => {
      const image = new Image();
      image.src = element.getAttribute('href');
      return image.decode();
    }));
    if (hero.classList.contains('hero--draw-complete')) return;
    for (const stroke of hero.querySelectorAll('.hero__draw-stroke')) {
      const animation = stroke.animate(
        [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
        { duration: Math.round((Number(stroke.dataset.drawDuration) || 380) / 1.5), easing: 'ease-in-out', fill: 'forwards', iterations: 1 }
      );
      animations.push(animation);
      await animation.finished;
    }
  } catch {
    // Show the complete artwork if decoding or animation is unavailable/interrupted.
  } finally {
    finish();
    motion.removeEventListener('change', onMotionChange);
  }
}

async function playIntro() {
  if (!intro) {
    drawHeroOnce();
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const logo = intro.querySelector('.intro__logo');
  const target = document.querySelector('.nav__logo img');
  document.querySelectorAll('.nav__links a, .nav__utils button').forEach((item, index) => {
    item.style.setProperty('--intro-order', index);
  });
  const finish = () => {
    document.body.classList.remove('intro-active');
    document.body.classList.add('intro-nav-visible', 'intro-complete');
    for (const element of document.body.children) element.inert = false;
    intro.remove();
    // Start the textured strokes once the two headline lines have been revealed.
    setTimeout(drawHeroOnce, reducedMotion ? 0 : 550);
  };

  if (reducedMotion || !logo || !target) {
    finish();
    return;
  }

  const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
  const openingMotion = intro.querySelector('.intro__logo img').getAnimations()[0];
  if (openingMotion) await openingMotion.finished.catch(() => {});
  await pause(90);

  // Reference timing, relative to the start of the downward background wipe:
  // 480ms bar, 680ms logo travel, 1100ms staggered links, 1700ms hero.
  intro.classList.add('intro--opening');
  await pause(480);
  document.body.classList.add('intro-nav-visible');
  await pause(200);

  const from = logo.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = to.width / from.width;
  const travel = logo.animate([
    { transform: 'translate(0, 0) scale(1)' },
    { transform: `translate(${x}px, ${y}px) scale(${scale})` }
  ], { duration: 650, easing: 'cubic-bezier(.65, 0, .25, 1)', fill: 'forwards' });
  await pause(420);
  document.body.classList.add('intro-menu-visible');
  await travel.finished.catch(() => {});
  document.body.classList.add('intro-logo-landed');
  logo.style.visibility = 'hidden';
  await pause(370);
  finish();
}

playIntro();

const footer = document.querySelector('.site-footer');
const footerMotion = footer?.querySelector('.site-footer__motion');
if (footer && footerMotion) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const svgNS = 'http://www.w3.org/2000/svg';
  let strokes = [];
  let played = false;

  const prepare = () => {
    const svg = footerMotion.contentDocument?.documentElement;
    if (!svg || svg.localName !== 'svg' || !svg.querySelector('g#motion > path')) return false;
    if (!motion.matches) {
      const defs = svg.ownerDocument.createElementNS(svgNS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
      strokes = [...svg.querySelectorAll('g#motion > path')].map((path, index) => {
        const mask = svg.ownerDocument.createElementNS(svgNS, 'mask');
        const trace = path.cloneNode(true);
        const box = path.getBBox();
        mask.id = `footer-draw-${index}`;
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', '0');
        mask.setAttribute('y', '0');
        mask.setAttribute('width', svg.viewBox.baseVal.width);
        mask.setAttribute('height', svg.viewBox.baseVal.height);
        trace.removeAttribute('id');
        trace.setAttribute('fill', 'none');
        trace.setAttribute('stroke', 'white');
        trace.setAttribute('stroke-width', '12');
        trace.setAttribute('stroke-linecap', 'round');
        trace.setAttribute('stroke-linejoin', 'round');
        trace.setAttribute('pathLength', '1');
        trace.setAttribute('stroke-dasharray', '1');
        trace.setAttribute('stroke-dashoffset', '1');
        mask.append(trace);
        defs.append(mask);
        path.setAttribute('mask', `url(#${mask.id})`);
        return { path, trace, box };
      }).sort((a, b) => a.box.x - b.box.x);
    }
    footerMotion.style.visibility = 'visible';
    return true;
  };

  const play = async () => {
    if (played) return;
    played = true;
    if (motion.matches) {
      strokes.forEach(({ path }) => path.removeAttribute('mask'));
      return;
    }
    for (const { path, trace, box } of strokes) {
      const animation = trace.animate(
        [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
        { duration: Math.max(180, Math.min(540, Math.round(box.width / 2.5))), easing: 'ease-in-out', fill: 'forwards' }
      );
      await animation.finished.catch(() => {});
      path.removeAttribute('mask');
      animation.cancel();
    }
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      play();
    }
  }, { threshold: 0.2 });
  const start = async () => {
    for (let attempt = 0; attempt < 30 && !prepare(); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!strokes.length && !motion.matches) {
      // Leave the original artwork visible if this browser cannot access SVG internals.
      footerMotion.style.visibility = 'visible';
    }
    observer.observe(footer);
  };
  if (footerMotion.contentDocument?.documentElement?.querySelector('g#motion > path')) start();
  else footerMotion.addEventListener('load', start, { once: true });
}

const videoSection = document.querySelector('.video-section');
if (videoSection) {
  let sceneHeight = 0;
  let stickyTop = 0;
  let scrollDistance = 0;
  let targetWidth = 0;
  let targetHeight = 0;
  let scrollFrame = 0;

  const updateVideoFrame = () => {
    scrollFrame = 0;
    const start = videoSection.getBoundingClientRect().top;
    const progress = Math.max(0, Math.min(1, (stickyTop - start) / scrollDistance));
    const width = window.innerWidth + (targetWidth - window.innerWidth) * progress;
    const height = sceneHeight + (targetHeight - sceneHeight) * progress;
    videoSection.style.setProperty('--video-frame-width', `${width}px`);
    videoSection.style.setProperty('--video-frame-height', `${height}px`);
    videoSection.style.setProperty('--video-frame-radius', `${15 * progress}px`);
  };

  const requestVideoFrame = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateVideoFrame);
  };

  const measureVideo = () => {
    const viewportHeight = window.innerHeight;
    sceneHeight = Math.min(viewportHeight, window.innerWidth * 1090 / 1920);
    stickyTop = Math.max(0, (viewportHeight - sceneHeight) / 2);
    scrollDistance = Math.max(360, Math.min(700, viewportHeight * 0.65));
    targetWidth = Math.min(1240, window.innerWidth * 1240 / 1920, sceneHeight * 1240 / 698);
    targetHeight = targetWidth * 698 / 1240;
    videoSection.style.setProperty('--video-scene-height', `${sceneHeight}px`);
    videoSection.style.setProperty('--video-sticky-top', `${stickyTop}px`);
    videoSection.style.setProperty('--video-scroll-distance', `${scrollDistance}px`);
    requestVideoFrame();
  };

  window.addEventListener('scroll', requestVideoFrame, { passive: true });
  window.addEventListener('resize', measureVideo);
  measureVideo();
}

const menuStage = document.querySelector('.menu-section__stage');
const menuImage = menuStage?.querySelector('.menu-section__hover-image');
const menuLinks = menuStage?.querySelectorAll('.menu-section__list a[data-menu-image]');

if (menuStage && menuImage && menuLinks) {
  const imageWidth = 198;
  const imageHeight = 306;
  let activeLink = null;
  let currentX = 1244;
  let currentY = -92;
  let targetX = currentX;
  let targetY = currentY;
  let animationFrame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  menuLinks.forEach((link) => {
    const image = new Image();
    image.src = `assets/menu/${link.dataset.menuImage}.png`;
  });

  const renderImagePosition = () => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    menuImage.style.setProperty('--menu-image-x', `${currentX}px`);
    menuImage.style.setProperty('--menu-image-y', `${currentY}px`);
    if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
      animationFrame = requestAnimationFrame(renderImagePosition);
    } else {
      animationFrame = 0;
    }
  };

  const moveImage = (x, y) => {
    targetX = Math.max(0, Math.min(1920 - imageWidth, x + 24));
    targetY = Math.max(-92, Math.min(548 - imageHeight + 92, y - imageHeight / 2));
    if (reducedMotion.matches) {
      currentX = targetX;
      currentY = targetY;
      menuImage.style.setProperty('--menu-image-x', `${currentX}px`);
      menuImage.style.setProperty('--menu-image-y', `${currentY}px`);
    } else if (!animationFrame) {
      animationFrame = requestAnimationFrame(renderImagePosition);
    }
  };

  const activateLink = (link) => {
    if (activeLink !== link) {
      activeLink?.classList.remove('is-active');
      activeLink = link;
      activeLink.classList.add('is-active');
      menuImage.src = `assets/menu/${link.dataset.menuImage}.png`;
    }
    menuImage.classList.add('is-visible');
  };

  const hideImage = () => {
    activeLink?.classList.remove('is-active');
    activeLink = null;
    menuImage.classList.remove('is-visible');
  };

  menuLinks.forEach((link) => {
    link.addEventListener('pointerenter', (event) => {
      activateLink(link);
      const bounds = menuStage.getBoundingClientRect();
      const scale = bounds.width / 1920;
      moveImage((event.clientX - bounds.left) / scale, (event.clientY - bounds.top) / scale);
    });
    link.addEventListener('pointermove', (event) => {
      const bounds = menuStage.getBoundingClientRect();
      const scale = bounds.width / 1920;
      moveImage((event.clientX - bounds.left) / scale, (event.clientY - bounds.top) / scale);
    });
    link.addEventListener('pointerleave', (event) => {
      if (!event.relatedTarget?.closest?.('.menu-section__list a') && document.activeElement !== link) hideImage();
    });
    link.addEventListener('focus', () => {
      activateLink(link);
      moveImage(1220, link.offsetTop + 61);
    });
  });

  menuStage.addEventListener('pointerleave', hideImage);
  menuStage.addEventListener('focusout', (event) => {
    if (!menuStage.contains(event.relatedTarget)) hideImage();
  });
}

updateHeroScale();
window.addEventListener('resize', updateHeroScale);

const productColorValues = {
  BLACK: '#000000', WHITE: '#f5f5f5', RED: '#e2211c', 'M.GREY': '#414141',
  BLUE: '#132ea0', YELLOW: '#fcb60d', GREEN: '#166116', IVORY: '#f5efe1',
  KHAKI: '#52430e', ORANGE: '#e2671c', CHARCOAL: '#414141',
  'S.BLUE': '#14a5f0', BURGUNDY: '#e2211c', PINK: '#e21c6b',
  MINT: '#1ee1e1', MULTI: 'conic-gradient(#fcb60d, #e2211c, #132ea0, #fcb60d)'
};

function renderProductColors(colors, selected) {
  return colors.map((color) => `
    <span class="product-color${color === selected ? ' product-color--selected' : ''}" role="listitem" aria-label="${color}" title="${color}" style="--swatch-color:${productColorValues[color]}"></span>
  `).join('');
}

const rgbColors = ['BLACK', 'WHITE', 'RED', 'M.GREY', 'BLUE'];

const products = [
  { x: 24, y: 221, image: 'left-top.png', imageX: -7, imageY: -61, imageW: 466, imageH: 699, name: 'RGB 에어로쿨 반팔 티셔츠 BLACK', heading: 'RGB AeroCool', alt: 'Model wearing a black Kodak T-shirt and pink shorts' },
  { x: 1444, y: 221, image: 'right-top.png', imageX: 0, imageY: 0, imageW: 453, imageH: 604, name: 'RGB 에어로쿨 반팔 티셔츠 BLUE', heading: 'RGB AeroCool', alt: 'Model holding a yellow and red Kodak backpack' },
  { x: 24, y: 1508, image: 'left-middle.png', imageX: 0, imageY: 1, imageW: 452, imageH: 602, name: 'RGB 에어로쿨 반팔 티셔츠 BLACK', heading: 'RGB AeroCool', alt: 'Model wearing a yellow Kodak T-shirt and blue shorts' },
  { x: 1444, y: 1508, image: 'right-middle.png', imageX: 0, imageY: 1, imageW: 452, imageH: 602, name: 'RGB 에어로쿨 반팔 티셔츠 BLACK', heading: 'TEXT', alt: 'Back of a model wearing a dark Kodak T-shirt' },
  { x: 24, y: 2491, image: 'left-bottom.png', imageX: -245, imageY: -209, imageW: 756, imageH: 1008, name: 'RGB 에어로쿨 반팔 티셔츠 BLACK', heading: 'RGB AeroCool', alt: 'Back of a green Kodak T-shirt outdoors' },
  { x: 1444, y: 2491, image: 'right-bottom.png', imageX: 0, imageY: 1, imageW: 452, imageH: 602, name: 'RGB 에어로쿨 반팔 티셔츠 BLACK', heading: 'RGB AeroCool', alt: 'Model wearing a cream Kodak shirt and blue shorts' },
];

const productContainer = document.querySelector('#con1-products');
if (productContainer) {
  productContainer.innerHTML = products.map((product) => `
    <article class="con1-product" style="--product-x:${product.x}px;--product-y:${product.y}px;--image-x:${product.imageX}px;--image-y:${product.imageY}px;--image-w:${product.imageW}px;--image-h:${product.imageH}px">
      <div class="con1-product__head"><strong>${product.heading}</strong><span>K6223<br>LRS54IVR</span></div>
      <div class="con1-product__image"><img src="assets/con1/${product.image}" alt="${product.alt}"></div>
      <div class="con1-product__details"><p class="con1-product__name">${product.name}</p><p class="con1-product__price">59,000원</p></div>
      <div class="con1-product__actions"><button type="button" data-action="favorite" aria-label="Add to favorites" aria-pressed="false"><img src="assets/con1/heart.svg" alt=""></button><button type="button" data-action="bag" aria-label="Add to bag"><img src="assets/con1/action.svg" alt=""></button></div>
      <div class="con1-product__colors"><span class="con1-product__colors-label">Color</span><div class="con1-product__dots" role="list" aria-label="Available colors">${renderProductColors(rgbColors, product.name.split(' ').pop())}</div></div>
    </article>
  `).join('');

}

const weeklyTitle = document.querySelector('.con2-section__title');
const weeklyYellowStroke = document.querySelector('#weekly-motion-yellow-stroke');
const weeklyBlackStroke = document.querySelector('#weekly-motion-black-stroke');

if (weeklyTitle && weeklyYellowStroke && weeklyBlackStroke) {
  let weeklyFrame = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));

  const updateWeeklyMotion = () => {
    weeklyFrame = 0;
    const titleTop = weeklyTitle.getBoundingClientRect().top;
    const progress = clamp((window.innerHeight * 0.78 - titleTop) / (window.innerHeight * 0.55));
    const yellowProgress = clamp(progress / 0.72);
    const blackProgress = clamp((progress - 0.72) / 0.28);
    weeklyYellowStroke.style.strokeDashoffset = String(1 - yellowProgress);
    weeklyBlackStroke.style.strokeDashoffset = String(1 - blackProgress);
  };

  const requestWeeklyMotion = () => {
    if (!weeklyFrame) weeklyFrame = requestAnimationFrame(updateWeeklyMotion);
  };

  window.addEventListener('scroll', requestWeeklyMotion, { passive: true });
  window.addEventListener('resize', requestWeeklyMotion);
  requestWeeklyMotion();
}

const weeklyProducts = [
  { image: 'top-1.png', size: 382, y: -1, name: '[히로노] 전판 그래픽 반팔 티셔츠 YELLOW', price: '79,000원' },
  { image: 'top-2.png', size: 382, y: -1, name: '스트라이프 반팔 티셔츠 GREEN', price: '79,000원' },
  { image: 'top-3.png', size: 382, y: -1, name: '소로나 애니매이션 그래픽 반팔 티셔츠 KHAKI', price: '59,000원' },
  { image: 'top-4.png', size: 382, y: -1, name: '코닥컴퍼니 코튼서커 반팔 셔켓 CHARCOAL', price: '149,000원' },
  { image: 'top-5.png', size: 382, y: 0, name: '오버핏 트러커 캡 BURGUNDY', price: '59,000원' },
  { image: 'bottom-1.png', size: 382, y: 0, name: '씨너리 그래픽 반팔티셔츠 PINK', price: '48,300원' },
  { image: 'bottom-2.png', size: 382, y: 0, name: '[히로노] 히로노 그래픽 아크릴 키링 MULTI', price: '11,900원' },
  { image: 'bottom-3.png', size: 382, y: 0, name: '썸머 그래픽 반팔티셔츠 ORANGE', price: '41,400원' },
  { image: 'bottom-4.png', size: 382, y: 0, name: '브리즈팝 에어로쿨 빅그래픽 슬리브리스 티셔츠 키즈 BLUE', price: '49,000원' },
  { image: 'bottom-5.png', size: 382, y: 0, name: '소로나 애니매이션 그래픽 반팔 티셔츠 BLACK', price: '59,000원' },
];

const weeklyColorOptions = {
  'top-1.png': ['WHITE', 'YELLOW'],
  'top-2.png': ['RED', 'GREEN'],
  'top-3.png': ['IVORY', 'ORANGE', 'KHAKI', 'BLACK'],
  'top-4.png': ['S.BLUE', 'IVORY', 'CHARCOAL'],
  'top-5.png': ['IVORY', 'BURGUNDY', 'BLACK'],
  'bottom-1.png': ['PINK', 'MINT', 'KHAKI'],
  'bottom-2.png': ['MULTI'],
  'bottom-3.png': ['S.BLUE', 'ORANGE', 'WHITE'],
  'bottom-4.png': ['WHITE', 'IVORY', 'BLUE', 'BLACK'],
  'bottom-5.png': ['IVORY', 'ORANGE', 'KHAKI', 'BLACK']
};

const weeklyContainer = document.querySelector('#con2-products');
if (weeklyContainer) {
  const renderWeeklyProduct = (product, index, copy = false) => `
    <article class="con2-product" style="--product-x:${24 + (index % 5) * 404}px;--image-size:${product.size}px;--image-y:${product.y}px">
      <div class="con2-product__image"><img src="assets/con2/${product.image}" alt="${copy ? '' : `Weekly best product ${index + 1}`}"></div>
      <div class="con2-product__details"><strong>${product.name}</strong><span>${product.price}</span></div>
      <div class="con2-product__actions"><button type="button" data-action="favorite" aria-label="Add to favorites" aria-pressed="false"><img src="assets/con1/heart.svg" alt=""></button><button type="button" data-action="bag" aria-label="Add to bag"><img src="assets/con1/action.svg" alt=""></button></div>
      <div class="con2-product__colors"><span class="con2-product__colors-label">Color</span><div class="con2-product__dots" role="list" aria-label="Available colors">${renderProductColors(weeklyColorOptions[product.image], product.name.split(' ').pop())}</div></div>
    </article>
  `;

  const rows = [weeklyProducts.slice(0, 5), weeklyProducts.slice(5)];
  weeklyContainer.innerHTML = rows.map((products, rowIndex) => `
    <div class="con2-products__row con2-products__row--${rowIndex === 0 ? 'right' : 'left'}">
      <div class="con2-products__track">
        ${[0, 1].map((setIndex) => {
          const copy = rowIndex === 0 ? setIndex === 0 : setIndex === 1;
          return `<div class="con2-products__set"${copy ? ' aria-hidden="true" inert' : ''}>${products.map((product, productIndex) => renderWeeklyProduct(product, rowIndex * 5 + productIndex, copy)).join('')}</div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function enableProductActions(container) {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.action === 'favorite') {
      const selected = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!selected));
      button.setAttribute('aria-label', selected ? 'Add to favorites' : 'Remove from favorites');
      return;
    }

    const bagCount = document.querySelector('.nav__bag span');
    if (bagCount) {
      const count = Number(bagCount.textContent) + 1;
      bagCount.textContent = String(count);
      bagCount.parentElement.setAttribute('aria-label', `Bag, ${count} items`);
    }
  });
}

enableProductActions(productContainer);
enableProductActions(weeklyContainer);
