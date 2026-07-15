const REPO = "kalilbubadra/continence-gallery";
const BRANCH = "main";
const API_URL = `https://api.github.com/repos/${REPO}/contents/?ref=${BRANCH}`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const gallery = document.querySelector("#gallery");
const statusMessage = document.querySelector("#status");
const photoCount = document.querySelector("#photoCount");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxCaption = document.querySelector("#lightboxCaption");
const closeLightbox = document.querySelector("#closeLightbox");
const prevPhoto = document.querySelector("#prevPhoto");
const nextPhoto = document.querySelector("#nextPhoto");

let photos = [];
let visiblePhotos = [];
let activeIndex = 0;

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

  if (sortSelect.value === "asc") {
    sorted.sort((a, b) => numberFromName(a.name) - numberFromName(b.name) || a.name.localeCompare(b.name));
  } else if (sortSelect.value === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } else {
    sorted.sort((a, b) => numberFromName(b.name) - numberFromName(a.name) || b.name.localeCompare(a.name));
  }

  return sorted;
}

function renderGallery() {
  const query = searchInput.value.trim().toLowerCase();
  visiblePhotos = sortPhotos(photos.filter((photo) => photo.name.toLowerCase().includes(query)));

  photoCount.textContent = visiblePhotos.length;
  gallery.innerHTML = "";

  if (!visiblePhotos.length) {
    statusMessage.textContent = query ? "Nenhuma foto encontrada para essa busca." : "Nenhuma imagem foi encontrada no repositorio.";
    return;
  }

  statusMessage.textContent = "";

  const fragment = document.createDocumentFragment();

  visiblePhotos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "photo-card";
    button.type = "button";
    button.setAttribute("aria-label", `Abrir ${photo.name}`);
    button.addEventListener("click", () => openPhoto(index));

    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = `Foto ${photo.name}`;
    image.loading = "lazy";

    const caption = document.createElement("span");
    caption.textContent = photo.name;

    button.append(image, caption);
    fragment.append(button);
  });

  gallery.append(fragment);
}

function openPhoto(index) {
  activeIndex = index;
  const photo = visiblePhotos[activeIndex];

  lightboxImage.src = photo.url;
  lightboxImage.alt = `Foto ${photo.name}`;
  lightboxCaption.textContent = `${photo.name} (${activeIndex + 1} de ${visiblePhotos.length})`;

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

searchInput.addEventListener("input", renderGallery);
sortSelect.addEventListener("change", renderGallery);
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
