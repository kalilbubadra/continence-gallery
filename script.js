const REPO = "kalilbubadra/continence-gallery";
const BRANCH = "main";
const API_URL = `https://api.github.com/repos/${REPO}/contents/?ref=${BRANCH}`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const gallery = document.querySelector("#gallery");
const statusMessage = document.querySelector("#status");
const photoCount = document.querySelector("#photoCount");
const loadSentinel = document.querySelector("#loadSentinel");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxCaption = document.querySelector("#lightboxCaption");
const closeLightbox = document.querySelector("#closeLightbox");
const prevPhoto = document.querySelector("#prevPhoto");
const nextPhoto = document.querySelector("#nextPhoto");

let photos = [];
let visiblePhotos = [];
let activeIndex = 0;
let renderedCount = 0;
let isRendering = false;
let galleryObserver;

const getBatchSize = () => (window.matchMedia("(max-width: 720px)").matches ? 12 : 30);

function isImage(file) {
  return file.type === "file" && IMAGE_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));
}

function numberFromName(name) {
  const match = name.match(/\d+/g);
  return match ? Number(match.join("")) : 0;
}

function getImageUrl(file) {
  return file.download_url || `${RAW_BASE_URL}${encodeURIComponent(file.name)}`;
}

function sortPhotos(items) {
  const sorted = [...items];
  sorted.sort((a, b) => numberFromName(b.name) - numberFromName(a.name) || b.name.localeCompare(a.name));
  return sorted;
}

function renderGallery() {
  visiblePhotos = sortPhotos(photos);

  photoCount.textContent = visiblePhotos.length;
  gallery.innerHTML = "";
  renderedCount = 0;

  if (!visiblePhotos.length) {
    statusMessage.textContent = "Nenhuma imagem foi encontrada no repositorio.";
    return;
  }

  statusMessage.textContent = "";
  renderNextBatch();
  setupGalleryObserver();
}

function preloadImage(photo) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = photo.url;
  });
}

function createPhotoCard(photo, index) {
  const button = document.createElement("button");
  button.className = "photo-card";
  button.type = "button";
  button.setAttribute("aria-label", `Abrir foto ${index + 1}`);
  button.addEventListener("click", () => openPhoto(index));

  const image = document.createElement("img");
  image.src = photo.url;
  image.alt = `Foto ${index + 1}`;
  image.loading = index < getBatchSize() ? "eager" : "lazy";
  image.decoding = "async";
  image.fetchPriority = index < 4 ? "high" : "auto";

  button.append(image);
  return button;
}

async function renderNextBatch() {
  if (isRendering || renderedCount >= visiblePhotos.length) return;

  isRendering = true;
  loadSentinel.classList.add("is-loading");

  const start = renderedCount;
  const batch = visiblePhotos.slice(start, start + getBatchSize());
  await Promise.all(batch.map(preloadImage));

  const fragment = document.createDocumentFragment();
  batch.forEach((photo, offset) => {
    fragment.append(createPhotoCard(photo, start + offset));
  });

  gallery.append(fragment);
  renderedCount += batch.length;
  isRendering = false;
  loadSentinel.classList.toggle("is-loading", renderedCount < visiblePhotos.length);
}

function setupGalleryObserver() {
  if (galleryObserver) {
    galleryObserver.disconnect();
  }

  galleryObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        renderNextBatch();
      }
    },
    {
      rootMargin: "1200px 0px"
    }
  );

  galleryObserver.observe(loadSentinel);
}

function openPhoto(index) {
  activeIndex = index;
  const photo = visiblePhotos[activeIndex];

  lightboxImage.src = photo.url;
  lightboxImage.alt = `Foto ${photo.name}`;
  lightboxCaption.textContent = "";

  if (!lightbox.open) {
    lightbox.showModal();
  }
}

function movePhoto(direction) {
  if (!visiblePhotos.length) return;
  activeIndex = (activeIndex + direction + visiblePhotos.length) % visiblePhotos.length;
  openPhoto(activeIndex);
}

async function loadPhotos() {
  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub respondeu com status ${response.status}`);
    }

    const files = await response.json();
    photos = files
      .filter(isImage)
      .map((file) => ({
        name: file.name,
        url: getImageUrl(file)
      }));

    renderGallery();
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Nao foi possivel carregar as fotos agora. Tente atualizar a pagina em alguns instantes.";
  }
}

closeLightbox.addEventListener("click", () => lightbox.close());
prevPhoto.addEventListener("click", () => movePhoto(-1));
nextPhoto.addEventListener("click", () => movePhoto(1));

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    lightbox.close();
  }
});

window.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;

  if (event.key === "ArrowLeft") {
    movePhoto(-1);
  }

  if (event.key === "ArrowRight") {
    movePhoto(1);
  }
});

loadPhotos();
