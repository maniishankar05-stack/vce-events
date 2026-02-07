const API_BASE = window.VCE_API_BASE || "";

const loginForm = document.getElementById("login-form");
const loginHint = document.getElementById("login-hint");
const dashboard = document.getElementById("dashboard");
const clubName = document.getElementById("club-name");
const logoutBtn = document.getElementById("logout");
const eventForm = document.getElementById("event-form");
const resetBtn = document.getElementById("reset");
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
  eventForm.reset();
  eventForm.elements.id.value = "";
  if (eventHint) eventHint.textContent = "";
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

logoutBtn.addEventListener("click", async () => {
  await request("/api/logout", { method: "POST" });
  setLoginState(null);
  resetForm();
});

resetBtn.addEventListener("click", () => resetForm());

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (eventHint) eventHint.textContent = "";
  const formData = new FormData(eventForm);
  const payload = Object.fromEntries(formData.entries());
  const id = payload.id;
  delete payload.id;

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

eventList.addEventListener("click", async (event) => {
  const editId = event.target.getAttribute("data-edit");
  const deleteId = event.target.getAttribute("data-delete");

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
    await request(`/api/events/${deleteId}`, { method: "DELETE" });
    await loadEvents();
  }
});

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
