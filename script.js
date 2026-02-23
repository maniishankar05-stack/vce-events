const API_BASE = window.VCE_API_BASE || "";
const DEFAULT_GALLERY_IMAGES = [
  {
    image_url:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
    alt_text: "VCE campus building",
  },
  {
    image_url:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
    alt_text: "Students at campus event",
  },
  {
    image_url:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
    alt_text: "College seminar audience",
  },
  {
    image_url:
      "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80",
    alt_text: "Students collaborating outdoors",
  },
];

const elements = {
  grid: document.getElementById("events-grid"),
  empty: document.getElementById("empty-state"),
  search: document.getElementById("search"),
  category: document.getElementById("category"),
  month: document.getElementById("month"),
  nextTitle: document.getElementById("next-event-title"),
  nextMeta: document.getElementById("next-event-meta"),
  updated: document.getElementById("updated-date"),
  download: document.getElementById("download-calendar"),
  gallerySlides: Array.from(document.querySelectorAll(".gallery-slide")),
  galleryPrev: document.getElementById("gallery-prev"),
  galleryNext: document.getElementById("gallery-next"),
  galleryDots: document.getElementById("gallery-dots"),
  galleryTrack: document.getElementById("gallery-track"),
};

let galleryIndex = 0;
let galleryTimer = null;

const renderGallery = (index) => {
  if (!elements.gallerySlides.length) return;
  galleryIndex = (index + elements.gallerySlides.length) % elements.gallerySlides.length;

  elements.gallerySlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === galleryIndex);
  });

  if (elements.galleryDots) {
    const dots = Array.from(elements.galleryDots.querySelectorAll(".gallery-dot"));
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === galleryIndex);
    });
  }
};

const startGallery = () => {
  if (!elements.gallerySlides.length) return;
  if (galleryTimer) clearInterval(galleryTimer);
  galleryTimer = setInterval(() => {
    renderGallery(galleryIndex + 1);
  }, 4000);
};

const initGallery = () => {
  if (!elements.gallerySlides.length) return;

  if (elements.galleryDots) {
    elements.galleryDots.innerHTML = "";
    elements.gallerySlides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot";
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dot.addEventListener("click", () => {
        renderGallery(index);
        startGallery();
      });
      elements.galleryDots.appendChild(dot);
    });
  }

  if (elements.galleryPrev) {
    elements.galleryPrev.addEventListener("click", () => {
      renderGallery(galleryIndex - 1);
      startGallery();
    });
  }

  if (elements.galleryNext) {
    elements.galleryNext.addEventListener("click", () => {
      renderGallery(galleryIndex + 1);
      startGallery();
    });
  }

  renderGallery(0);
  startGallery();
};

const loadGallery = async () => {
  try {
    if (API_BASE) {
      const response = await fetch(`${API_BASE}/api/gallery`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length) return data;
      }
    }

    const response = await fetch("/api/gallery");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (_) {
    // fallback below
  }
  return DEFAULT_GALLERY_IMAGES;
};

const mountGallerySlides = (images) => {
  if (!elements.galleryTrack) return;
  elements.galleryTrack.innerHTML = "";
  images.forEach((image, index) => {
    const slide = document.createElement("img");
    slide.className = `gallery-slide${index === 0 ? " active" : ""}`;
    slide.src = image.image_url;
    slide.alt = image.alt_text || "Campus gallery image";
    elements.galleryTrack.appendChild(slide);
  });
  elements.gallerySlides = Array.from(document.querySelectorAll(".gallery-slide"));
};

const normalizeDateString = (dateString) => {
  if (!dateString) return dateString;
  const parsed = Date.parse(dateString);
  if (!Number.isNaN(parsed) && /[a-zA-Z]/.test(dateString)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  if (dateString.includes("T")) return dateString.split("T")[0];
  if (dateString.includes(" ")) return dateString.split(" ")[0];
  if (dateString.includes("-")) return dateString;
  const parts = dateString.split("/");
  if (parts.length !== 3) return dateString;
  const [day, month, year] = parts.map((part) => part.trim());
  if (!day || !month || !year) return dateString;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const formatDate = (dateString) => {
  const normalized = normalizeDateString(dateString);
  const date = new Date(`${normalized}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatMonth = (dateString) => {
  const normalized = normalizeDateString(dateString);
  const date = new Date(`${normalized}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const toMonthKey = (dateString) => dateString.slice(0, 7);

const isUpcomingEvent = (event) => {
  const normalized = normalizeDateString(event.date);
  const eventDate = new Date(`${normalized}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(eventDate.getTime()) && eventDate >= today;
};

const renderCard = (event) => {
  const card = document.createElement("article");
  card.className = "event-card";
  card.innerHTML = `
    <span class="badge">${event.category}</span>
    <div>
      <h3>${event.title}</h3>
      <p class="event-meta">${formatDate(event.date)} · ${event.time}</p>
      <p class="event-meta">${event.venue}</p>
    </div>
    <div class="event-footer">
      <span>${event.organizer}</span>
      <a href="${event.registration}" target="_blank" rel="noreferrer">Register</a>
    </div>
  `;
  return card;
};

const updateNextEvent = (events) => {
  if (!events.length) {
    elements.nextTitle.textContent = "No upcoming events";
    elements.nextMeta.textContent = "Check back soon";
    return;
  }

  const nextEvent = events[0];
  elements.nextTitle.textContent = nextEvent.title;
  elements.nextMeta.textContent = `${formatDate(nextEvent.date)} · ${nextEvent.venue}`;
};

const populateFilters = (events) => {
  const categories = new Set(events.map((event) => event.category));
  const months = new Map();

  events.forEach((event) => {
    months.set(toMonthKey(event.date), formatMonth(event.date));
  });

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.category.appendChild(option);
  });

  [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      elements.month.appendChild(option);
    });
};

const applyFilters = (events) => {
  const query = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;
  const month = elements.month.value;

  return events.filter((event) => {
    const matchesQuery = event.title.toLowerCase().includes(query);
    const matchesCategory = category === "all" || event.category === category;
    const matchesMonth = month === "all" || toMonthKey(event.date) === month;
    return matchesQuery && matchesCategory && matchesMonth;
  });
};

const renderEvents = (events) => {
  elements.grid.innerHTML = "";
  if (!events.length) {
    elements.empty.classList.remove("hidden");
    return;
  }
  elements.empty.classList.add("hidden");
  events.forEach((event) => elements.grid.appendChild(renderCard(event)));
};

const buildCalendarFile = (events) => {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VCE//Upcoming Events//EN",
  ];
  const footer = ["END:VCALENDAR"];

  const body = events.slice(0, 5).map((event, index) => {
    const start = `${event.date.replace(/-/g, "")}T090000`;
    const uid = `vce-${index}-${event.date}@vardhaman.edu`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${start}Z`,
      `DTSTART:${start}Z`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.venue}`,
      "END:VEVENT",
    ];
  });

  return [...header, ...body.flat(), ...footer].join("\n");
};

const loadEvents = async () => {
  if (API_BASE) {
    const response = await fetch(`${API_BASE}/api/events`, {
      credentials: "include",
    });
    if (response.ok) {
      return response.json();
    }
  }

  try {
    const response = await fetch("/api/events", { credentials: "include" });
    if (response.ok) return response.json();
  } catch (_) {
    // ignore and fallback to local data
  }

  if (Array.isArray(window.VCE_EVENTS) && window.VCE_EVENTS.length) {
    return window.VCE_EVENTS;
  }

  const response = await fetch("data/events.json");
  return response.json();
};

const init = async () => {
  try {
    const galleryImages = await loadGallery();
    mountGallerySlides(galleryImages);
    initGallery();

    const data = await loadEvents();

    const events = data
      .map((event) => ({ ...event }))
      .filter((event) => isUpcomingEvent(event))
      .sort((a, b) =>
        normalizeDateString(a.date).localeCompare(normalizeDateString(b.date))
      );

    populateFilters(events);
    updateNextEvent(events);
    renderEvents(events);
    elements.updated.textContent = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const handleUpdate = () => renderEvents(applyFilters(events));

    [elements.search, elements.category, elements.month].forEach((input) => {
      input.addEventListener("input", handleUpdate);
      input.addEventListener("change", handleUpdate);
    });

    elements.download.addEventListener("click", () => {
      const fileContent = buildCalendarFile(events);
      const blob = new Blob([fileContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vce-events.ics";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    elements.grid.innerHTML =
      "<p>Unable to load events at the moment. Please try again soon.</p>";
    console.error(error);
  }
};

init();
