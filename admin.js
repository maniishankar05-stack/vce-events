const API_BASE = window.VCE_API_BASE || "";

const loginForm = document.getElementById("login-form");
const loginHint = document.getElementById("login-hint");
const dashboard = document.getElementById("dashboard");
const clubName = document.getElementById("club-name");
const logoutBtn = document.getElementById("logout");
const eventForm = document.getElementById("event-form");
const resetBtn = document.getElementById("clear-form");
const eventList = document.getElementById("event-list");
const eventHint = document.getElementById("event-hint");

const setLoginState = (club) => {
  if (club) {
    clubName.textContent = `${club.name} Events`;
    dashboard.classList.remove("hidden");
    loginForm.classList.add("hidden");
  } else {
    dashboard.classList.add("hidden");
    loginForm.classList.remove("hidden");
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(message.error || "Request failed");
  }

  return response.json();
};

const loadEvents = async () => {
  const events = await request("/api/events/mine");
  renderEvents(events);
};

const renderEvents = (events) => {
  eventList.innerHTML = "";
  if (!events.length) {
    eventList.innerHTML = "<p class=\"hint\">No events yet.</p>";
    return;
  }

  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "event-item";
    item.innerHTML = `
      <h3>${event.title}</h3>
      <p>${event.date} · ${event.time}</p>
      <p>${event.venue} · ${event.category}</p>
      <div class="event-actions">
        <button class="ghost" data-edit="${event.id}">Edit</button>
        <button class="ghost" data-delete="${event.id}">Delete</button>
      </div>
    `;
    eventList.appendChild(item);
  });
};

const resetForm = () => {
  HTMLFormElement.prototype.reset.call(eventForm);
  eventForm.elements.id.value = "";
  if (eventHint) eventHint.textContent = "";
};

const normalizeDateInput = (value) => {
  if (!value) return value;
  if (value.includes("-")) return value;
  const parts = value.split("/");
  if (parts.length !== 3) return value;
  const [day, month, year] = parts.map((part) => part.trim());
  if (!day || !month || !year) return value;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginHint.textContent = "";
  const formData = new FormData(loginForm);
  try {
    const payload = Object.fromEntries(formData.entries());
    const response = await request("/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setLoginState(response.club);
    await loadEvents();
  } catch (error) {
    loginHint.textContent = error.message;
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await request("/api/logout", { method: "POST" });
    setLoginState(null);
    resetForm();
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => resetForm());
}

if (eventForm) {
  eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (eventHint) eventHint.textContent = "";
  const formData = new FormData(eventForm);
  const payload = Object.fromEntries(formData.entries());
  const id = payload.id;
  delete payload.id;
  payload.date = normalizeDateInput(payload.date);

  const method = id ? "PUT" : "POST";
  const path = id ? `/api/events/${id}` : "/api/events";

  try {
    await request(path, {
      method,
      body: JSON.stringify(payload),
    });
    resetForm();
    await loadEvents();
    if (eventHint) eventHint.textContent = "Saved.";
  } catch (error) {
    if (eventHint) eventHint.textContent = error.message;
  }

  });
}

if (eventList) {
  eventList.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("button");
  if (!actionButton) return;
  const editId = actionButton.getAttribute("data-edit");
  const deleteId = actionButton.getAttribute("data-delete");

  if (editId) {
    const events = await request("/api/events/mine");
    const selected = events.find((item) => String(item.id) === editId);
    if (!selected) return;
    Object.keys(eventForm.elements).forEach((key) => {
      if (eventForm.elements[key]) {
        eventForm.elements[key].value = selected[key] ?? "";
      }
    });
  }

  if (deleteId) {
    if (!confirm("Delete this event?")) return;
    try {
      await request(`/api/events/${deleteId}`, { method: "DELETE" });
      await loadEvents();
      if (eventHint) eventHint.textContent = "Deleted.";
    } catch (error) {
      if (eventHint) eventHint.textContent = error.message;
    }
  }
  });
}

const bootstrap = async () => {
  try {
    const response = await request("/api/me");
    if (response.club) {
      setLoginState(response.club);
      await loadEvents();
    }
  } catch (error) {
    console.error(error);
  }
};

bootstrap();
