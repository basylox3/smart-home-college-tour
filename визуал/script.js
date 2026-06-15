const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const canvas = document.querySelector(".background-canvas");
const context = canvas ? canvas.getContext("2d") : null;
const glow = document.querySelector(".cursor-glow");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const cards = [...document.querySelectorAll(".tour-card")];
const activeTitle = document.querySelector("#active-title");
const activeText = document.querySelector("#active-text");
const activeTags = document.querySelector("#active-tags");
const activePreview = document.querySelector("#active-preview");
const heroSceneTitle = document.querySelector("#hero-scene-title");
const viewer = document.querySelector(".tour-viewer");
const viewerTitle = document.querySelector("#viewer-title");
const viewerText = document.querySelector("#viewer-text");
const viewerVisual = document.querySelector("#viewer-visual");
const viewerTags = document.querySelector("#viewer-tags");
const reviewsList = document.querySelector("#reviews-list");
const reviewForm = document.querySelector("#review-form");
const reviewFormStatus = document.querySelector("#review-form-status");
const floatingElements = [...document.querySelectorAll("[data-float]")];
const tiltElements = [...document.querySelectorAll("[data-tilt]")];
const customReviewsKey = "college-visual-reviews";

let activeIndex = 0;
let width = window.innerWidth;
let height = window.innerHeight;
let particles = [];
let animationFrame = 0;
let canvasFrame = 0;
const pointer = {
  targetX: width / 2,
  targetY: height / 2,
  x: width / 2,
  y: height / 2,
};

function getCardData(card) {
  return {
    title: card.dataset.title || "Сцена кампуса",
    text: card.dataset.text || "Описание зоны появится здесь.",
    tags: (card.dataset.tags || "Кампус").split(",").filter(Boolean),
    visual: card.dataset.visual || "visual-atrium",
    accent: card.dataset.accent || "#63d9ff",
  };
}

function renderTags(container, tags) {
  if (!container) return;
  container.innerHTML = "";
  tags.forEach((tag) => {
    const item = document.createElement("span");
    item.textContent = tag;
    container.appendChild(item);
  });
}

function updateSidebar(card) {
  const data = getCardData(card);
  if (activeTitle) activeTitle.textContent = data.title;
  if (activeText) activeText.textContent = data.text;
  if (heroSceneTitle) heroSceneTitle.textContent = data.title;
  renderTags(activeTags, data.tags);

  if (activePreview) {
    const orb = activePreview.querySelector(".mini-orb");
    if (orb) {
      orb.className = `mini-orb ${data.visual}`;
      orb.style.boxShadow = `inset -18px -18px 42px rgba(0, 0, 0, 0.34), 0 0 44px ${data.accent}33`;
    }
  }
}

function layoutCards() {
  const total = cards.length;
  const compact = window.innerWidth < 740;
  const radius = compact ? 190 : 280;
  const spread = total > 0 ? 360 / total : 0;

  cards.forEach((card, index) => {
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const absOffset = Math.abs(offset);
    const angle = offset * spread;
    const scale = offset === 0 ? 1 : 0.82 - absOffset * 0.06;
    card.classList.toggle("is-active", offset === 0);
    card.style.opacity = absOffset > 2 ? "0" : "1";
    card.style.filter = offset === 0 ? "none" : "blur(1px) saturate(0.8)";
    card.style.zIndex = String(20 - absOffset);
    card.style.transform = `translate3d(-50%, calc(-50% + ${absOffset * 12}px), 0) rotateY(${angle}deg) translateZ(${radius}px) scale(${Math.max(scale, 0.64)})`;
  });
}

function setActiveCard(index) {
  activeIndex = (index + cards.length) % cards.length;
  updateSidebar(cards[activeIndex]);
  layoutCards();
}

function openViewer(card) {
  const data = getCardData(card);
  if (!viewer) return;
  if (viewerTitle) viewerTitle.textContent = data.title;
  if (viewerText) viewerText.textContent = data.text;
  if (viewerVisual) {
    viewerVisual.className = `tour-panorama-view ${data.visual}`;
    viewerVisual.style.backgroundPosition = "50% center";
  }
  renderTags(viewerTags, data.tags);
  viewer.classList.add("is-open");
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeViewer() {
  if (!viewer) return;
  viewer.classList.remove("is-open");
  viewer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]).join("");
  return (letters || "О").toUpperCase();
}

function getStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 5));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function loadCustomReviews() {
  try {
    const reviews = JSON.parse(localStorage.getItem(customReviewsKey) || "[]");
    if (!Array.isArray(reviews)) return [];
    return reviews.map((review, index) => ({
      ...review,
      id: review.id || `review-${index}-${review.date || ""}-${review.name || ""}`,
    }));
  } catch {
    return [];
  }
}

function saveCustomReviews(reviews) {
  try {
    localStorage.setItem(customReviewsKey, JSON.stringify(reviews));
    return true;
  } catch {
    if (reviewFormStatus) {
      reviewFormStatus.textContent = "Отзыв добавлен, но браузер не разрешил сохранить его надолго.";
    }
    return false;
  }
}

function deleteCustomReview(reviewId, card) {
  const reviews = loadCustomReviews().filter((review) => review.id !== reviewId);
  const saved = saveCustomReviews(reviews);

  if (saved) {
    card.remove();
  }

  if (reviewFormStatus) {
    reviewFormStatus.textContent = saved
      ? "Отзыв удален."
      : "Браузер не разрешил удалить отзыв из сохранения.";
  }
}

function createReviewCard(review) {
  const card = document.createElement("article");
  card.className = "review-card";

  const top = document.createElement("div");
  top.className = "review-card__top";

  const avatar = document.createElement("span");
  avatar.className = "review-avatar";
  avatar.textContent = getInitials(review.name);

  const person = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = review.name;
  const role = document.createElement("p");
  role.textContent = review.role;
  person.append(title, role);

  const badge = document.createElement("span");
  badge.className = "review-badge";
  badge.textContent = "ваш отзыв";

  const deleteButton = document.createElement("button");
  deleteButton.className = "review-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.setAttribute("aria-label", `Удалить отзыв от ${review.name}`);
  deleteButton.addEventListener("click", () => deleteCustomReview(review.id, card));

  const actions = document.createElement("div");
  actions.className = "review-actions";
  actions.append(badge, deleteButton);

  top.append(avatar, person, actions);

  const rating = document.createElement("div");
  rating.className = "review-rating";
  rating.setAttribute("aria-label", `Оценка ${review.rating} из 5`);
  rating.textContent = getStars(review.rating);

  const text = document.createElement("p");
  text.className = "review-text";
  text.textContent = review.text;

  const date = document.createElement("span");
  date.className = "review-date";
  date.textContent = review.date;

  card.append(top, rating, text, date);
  return card;
}

function renderCustomReviews() {
  if (!reviewsList) return;
  loadCustomReviews()
    .forEach((review) => {
      reviewsList.prepend(createReviewCard(review));
    });
}

function updatePointer(clientX, clientY) {
  pointer.targetX = clientX;
  pointer.targetY = clientY;
}

function handleScroll() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  root.style.setProperty("--progress", String(progress));
}

function applyFloatingTransforms(normalizedX, normalizedY) {
  const positionScale = window.innerWidth < 640 ? 0.72 : window.innerWidth < 820 ? 0.86 : 1;
  const depthScale = window.innerWidth < 640 ? 0.88 : 1;

  floatingElements.forEach((element) => {
    const isInfoPanel = element.classList.contains("float-panel");
    const baseX = Number(element.dataset.x || 0) * positionScale;
    const baseY = Number(element.dataset.y || 0) * positionScale;
    const baseZ = Number(element.dataset.z || 0) * depthScale;
    const depth = Number(element.dataset.depth || 0);
    const baseRotateX = Number(element.dataset.rx || 0);
    const moveScale = isInfoPanel ? 0.26 : 1;
    const rotateScale = isInfoPanel ? 0 : 1;
    const moveX = normalizedX * depth * 180 * moveScale;
    const moveY = normalizedY * depth * 140 * moveScale;
    const rotateY = normalizedX * depth * 40 * rotateScale;
    const rotateX = baseRotateX + normalizedY * depth * -34 * rotateScale;

    element.style.transform = `translate3d(calc(-50% + ${baseX + moveX}px), calc(-50% + ${baseY + moveY}px), ${baseZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
}

function renderScene() {
  pointer.x += (pointer.targetX - pointer.x) * 0.08;
  pointer.y += (pointer.targetY - pointer.y) * 0.08;

  const normalizedX = window.innerWidth ? (pointer.x / window.innerWidth - 0.5) * 2 : 0;
  const normalizedY = window.innerHeight ? (pointer.y / window.innerHeight - 0.5) * 2 : 0;

  if (glow) {
    glow.style.transform = `translate3d(${pointer.x - 208}px, ${pointer.y - 208}px, 0)`;
  }

  document.querySelectorAll(".scene-frame").forEach((frame) => {
    if (!prefersReducedMotion) {
      const frameRotateX = window.innerWidth < 640 ? normalizedY * -1.2 : normalizedY * -2.2;
      const frameRotateY = window.innerWidth < 640 ? normalizedX * 1.6 : normalizedX * 3.2;
      frame.style.transform = `perspective(1600px) rotateX(${frameRotateX}deg) rotateY(${frameRotateY}deg)`;
    }
  });

  applyFloatingTransforms(normalizedX, normalizedY);
  animationFrame = window.requestAnimationFrame(renderScene);
}

function createParticles() {
  const density = window.innerWidth < 640 ? 26 : 42;
  particles = Array.from({ length: density }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.24,
    vy: (Math.random() - 0.5) * 0.24,
    size: Math.random() * 2.2 + 0.8,
    depth: Math.random() * 0.8 + 0.2,
  }));
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  layoutCards();

  if (!canvas || !context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  createParticles();
}

function drawCanvas() {
  if (!context) return;

  context.clearRect(0, 0, width, height);
  particles.forEach((particle, index) => {
    const dx = particle.x - pointer.x;
    const dy = particle.y - pointer.y;
    const distance = Math.hypot(dx, dy) || 1;
    const force = Math.max(0, 140 - distance) / 140;

    particle.vx += (dx / distance) * force * 0.004 * particle.depth;
    particle.vy += (dy / distance) * force * 0.004 * particle.depth;
    particle.x += particle.vx + (pointer.x / width - 0.5) * particle.depth * 0.16;
    particle.y += particle.vy + (pointer.y / height - 0.5) * particle.depth * 0.16;
    particle.vx *= 0.992;
    particle.vy *= 0.992;

    if (particle.x < -40) particle.x = width + 40;
    if (particle.x > width + 40) particle.x = -40;
    if (particle.y < -40) particle.y = height + 40;
    if (particle.y > height + 40) particle.y = -40;

    context.beginPath();
    context.fillStyle = `rgba(108, 231, 255, ${0.16 + particle.depth * 0.28})`;
    context.arc(particle.x, particle.y, particle.size * particle.depth, 0, Math.PI * 2);
    context.fill();

    for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
      const next = particles[nextIndex];
      const linkDistance = Math.hypot(particle.x - next.x, particle.y - next.y);
      if (linkDistance <= 130) {
        context.beginPath();
        context.strokeStyle = `rgba(154, 124, 255, ${0.12 - linkDistance / 1500})`;
        context.lineWidth = 1;
        context.moveTo(particle.x, particle.y);
        context.lineTo(next.x, next.y);
        context.stroke();
      }
    }
  });

  if (!prefersReducedMotion) {
    canvasFrame = window.requestAnimationFrame(drawCanvas);
  }
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("is-open", !expanded);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    });
  });
}

cards.forEach((card, index) => {
  card.addEventListener("click", () => {
    setActiveCard(index);
    openViewer(card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActiveCard(index);
      openViewer(card);
    }
  });
});

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = Number(button.dataset.step || 1);
    setActiveCard(activeIndex + direction);
  });
});

document.querySelectorAll("[data-close-viewer]").forEach((button) => {
  button.addEventListener("click", closeViewer);
});

if (reviewForm && reviewsList) {
  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(reviewForm);
    const name = String(formData.get("name") || "").trim();
    const role = String(formData.get("role") || "").trim();
    const rating = Number(formData.get("rating") || 5);
    const text = String(formData.get("text") || "").trim();

    if (name.length < 2 || role.length < 2 || text.length < 24) {
      if (reviewFormStatus) {
        reviewFormStatus.textContent = "Добавьте имя, роль и отзыв хотя бы на 2-3 предложения.";
      }
      return;
    }

    const review = {
      id: `review-${Date.now()}`,
      name,
      role,
      rating,
      text,
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
    };
    const reviews = loadCustomReviews();
    reviews.push(review);
    const saved = saveCustomReviews(reviews.slice(-24));
    reviewsList.prepend(createReviewCard(review));
    reviewForm.reset();

    if (reviewFormStatus && saved) {
      reviewFormStatus.textContent = "Отзыв добавлен и сохранен в этом браузере.";
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeViewer();
  }
});

if (viewerVisual) {
  viewerVisual.addEventListener("pointermove", (event) => {
    const bounds = viewerVisual.getBoundingClientRect();
    const next = ((event.clientX - bounds.left) / bounds.width) * 100;
    viewerVisual.style.backgroundPosition = `${Math.max(0, Math.min(100, next))}% center`;
  });
}

tiltElements.forEach((element) => {
  element.addEventListener("pointermove", (event) => {
    if (prefersReducedMotion) return;
    const bounds = element.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    element.style.transform = `perspective(900px) rotateX(${offsetY * -10}deg) rotateY(${offsetX * 10}deg) translateY(-4px)`;
  });
  element.addEventListener("pointerleave", () => {
    element.style.transform = "";
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 },
);

document.querySelectorAll(".reveal").forEach((element) => {
  if (prefersReducedMotion) {
    element.classList.add("is-visible");
  } else {
    revealObserver.observe(element);
  }
});

window.addEventListener("mousemove", (event) => updatePointer(event.clientX, event.clientY));
window.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];
    if (touch) updatePointer(touch.clientX, touch.clientY);
  },
  { passive: true },
);
window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", resizeCanvas);

handleScroll();
resizeCanvas();
setActiveCard(0);
renderCustomReviews();
drawCanvas();

if (prefersReducedMotion) {
  applyFloatingTransforms(0, 0);
} else {
  animationFrame = window.requestAnimationFrame(renderScene);
}

window.addEventListener("beforeunload", () => {
  window.cancelAnimationFrame(animationFrame);
  window.cancelAnimationFrame(canvasFrame);
});
