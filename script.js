const API_BASE = window.VCE_API_BASE || "";

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
};

const normalizeDateString = (dateString) => {
  if (!dateString) return dateString;
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
    const data = await loadEvents();

    const events = data
      .map((event) => ({ ...event }))
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
