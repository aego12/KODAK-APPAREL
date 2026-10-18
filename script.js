function updateHeroScale() {
  document.documentElement.style.setProperty('--hero-scale', Math.min(window.innerWidth / 1920, 1));
}

updateHeroScale();
window.addEventListener('resize', updateHeroScale);

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
      <div class="con1-product__colors"><span class="con1-product__colors-label">Color</span><div class="con1-product__dots"><img src="assets/con1/select-on.svg" alt=""><img src="assets/con1/select-on.svg" alt=""><img src="assets/con1/select-on.svg" alt=""></div></div>
    </article>
  `).join('');

}

const weeklyProducts = [
  { image: 'top-1.png', size: 382, y: -1 },
  { image: 'top-2.png', size: 382, y: -1 },
  { image: 'top-3.png', size: 382, y: -1 },
  { image: 'top-4.png', size: 382, y: -1 },
  { image: 'top-5.png', size: 381, y: 0 },
  { image: 'bottom-1.png', size: 382, y: 0 },
  { image: 'bottom-2.png', size: 382, y: 0 },
  { image: 'bottom-3.png', size: 382, y: 0 },
  { image: 'bottom-4.png', size: 382, y: 0 },
  { image: 'bottom-5.png', size: 381, y: 0 },
];

const weeklyContainer = document.querySelector('#con2-products');
if (weeklyContainer) {
  weeklyContainer.innerHTML = weeklyProducts.map((product, index) => `
    <article class="con2-product" style="--product-x:${24 + (index % 5) * 404}px;--product-y:${index < 5 ? 0 : 621}px;--image-size:${product.size}px;--image-y:${product.y}px">
      <div class="con2-product__image"><img src="assets/con2/${product.image}" alt="Weekly best product ${index + 1}"></div>
      <div class="con2-product__details"><strong>TEXT</strong><span>TEXT</span></div>
      <div class="con2-product__actions"><button type="button" data-action="favorite" aria-label="Add to favorites" aria-pressed="false"><img src="assets/con1/heart.svg" alt=""></button><button type="button" data-action="bag" aria-label="Add to bag"><img src="assets/con1/action.svg" alt=""></button></div>
      <div class="con2-product__colors"><span class="con2-product__colors-label">Color</span><div class="con2-product__dots"><img src="assets/con1/select-on.svg" alt=""><img src="assets/con1/select-on.svg" alt=""><img src="assets/con1/select-on.svg" alt=""></div></div>
    </article>
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
