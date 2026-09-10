const DATASETS = [
  { url: "data/atlantic.txt", basin: "Atlantic" },
  { url: "data/pacific.txt", basin: "Pacific" }
];

const $ = (id) => document.getElementById(id);

const map = L.map("map", {
  worldCopyJump: true,
  zoomControl: true
}).setView([22, -65], 3);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 9
}).addTo(map);

let storms = [];
let visibleStorms = [];
let trackLayer = L.layerGroup().addTo(map);
let selectedId = null;

function parseCoord(value) {
  const s = value.trim().toUpperCase();
  const n = parseFloat(s);
  if (s.endsWith("S") || s.endsWith("W")) return -n;
  return n;
}

function categoryFromWind(knots) {
  if (knots >= 137) return { key: "C5", label: "Category 5", color: "#d765ff" };
  if (knots >= 113) return { key: "C4", label: "Category 4", color: "#ff4567" };
  if (knots >= 96)  return { key: "C3", label: "Category 3", color: "#ff7a45" };
  if (knots >= 83)  return { key: "C2", label: "Category 2", color: "#ffb347" };
  if (knots >= 64)  return { key: "C1", label: "Category 1", color: "#ffe66b" };
  if (knots >= 34)  return { key: "TS", label: "Tropical Storm", color: "#4de0c1" };
  return { key: "TD", label: "Tropical Depression", color: "#68b7ff" };
}

function pointStyle(point) {
  // HURDAT2 status codes include HU, TS, TD, EX, SD, SS, LO, WV, DB.
  if (["EX", "LO", "WV", "DB"].includes(point.status)) {
    return { key: "OTHER", label: point.status, color: "#a8b2bf" };
  }
  return categoryFromWind(point.wind);
}

function parseHurdat(text, basin) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    const header = line.split(",").map(v => v.trim());
    const id = header[0] || "";
    const name = header[1] || "UNNAMED";
    const count = Number(header[2]);

    if (!/^[A-Z]{2}\d{6}$/i.test(id) || !Number.isFinite(count)) {
      i++;
      continue;
    }

    const points = [];
    for (let j = 0; j < count && i + 1 + j < lines.length; j++) {
      const fields = lines[i + 1 + j].split(",").map(v => v.trim());
      if (fields.length < 8) continue;

      const date = fields[0];
      const time = fields[1].padStart(4, "0");
      const recordId = fields[2] || "";
      const status = fields[3] || "";
      const lat = parseCoord(fields[4]);
      const lon = parseCoord(fields[5]);
      const wind = Number(fields[6]);
      const pressure = Number(fields[7]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      points.push({
        date, time, recordId, status, lat, lon,
        wind: Number.isFinite(wind) ? wind : null,
        pressure: Number.isFinite(pressure) && pressure > 0 ? pressure : null
      });
    }

    if (points.length) {
      const peakWind = Math.max(...points.map(p => p.wind ?? -Infinity));
      // Include only systems that reached tropical-storm strength or higher at some point.
      if (peakWind >= 34) {
        const year = Number(id.slice(-4));
        const minPressures = points.map(p => p.pressure).filter(Boolean);
        const minPressure = minPressures.length ? Math.min(...minPressures) : null;
        const maxClass = categoryFromWind(peakWind);

        out.push({
          id: id.toUpperCase(),
          name: name.toUpperCase(),
          year,
          basin,
          points,
          peakWind,
          minPressure,
          maxClass
        });
      }
    }

    i += count + 1;
  }

  return out;
}

function formatDate(date) {
  if (!date || date.length !== 8) return date;
  const y = date.slice(0,4);
  const m = date.slice(4,6);
  const d = date.slice(6,8);
  return new Date(`${y}-${m}-${d}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
  });
}

function ktToMph(knots) {
  return Math.round(knots * 1.15078);
}

function filterStorms() {
  const q = $("search").value.trim().toLowerCase();
  const basin = $("basinFilter").value;
  const type = $("typeFilter").value;

  visibleStorms = storms.filter(storm => {
    const haystack = `${storm.name} ${storm.year} ${storm.id} ${storm.basin}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (basin !== "all" && storm.basin !== basin) return false;

    const hurricane = storm.peakWind >= 64;
    if (type === "HU" && !hurricane) return false;
    if (type === "TS" && hurricane) return false;

    return true;
  });

  visibleStorms.sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
  renderResults();
}

function renderResults() {
  $("status").textContent = `${visibleStorms.length.toLocaleString()} storms found`;

  const maxShown = 300;
  const list = visibleStorms.slice(0, maxShown);

  $("results").innerHTML = list.map(storm => `
    <button class="result ${storm.id === selectedId ? "active" : ""}" data-id="${storm.id}">
      <div class="result-top">
        <span class="result-name">${escapeHtml(storm.name)}</span>
        <span class="result-year">${storm.year}</span>
      </div>
      <div class="result-meta">
        <span class="mini-badge" style="background:${storm.maxClass.color}">${storm.maxClass.label}</span>
        <span>${storm.basin}</span>
        <span>${storm.peakWind} kt</span>
      </div>
    </button>
  `).join("");

  if (visibleStorms.length > maxShown) {
    $("results").insertAdjacentHTML("beforeend",
      `<div class="status" style="padding:10px 12px">Showing first ${maxShown}. Search to narrow the list.</div>`
    );
  }

  document.querySelectorAll(".result").forEach(btn => {
    btn.addEventListener("click", () => openStorm(btn.dataset.id));
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function openStorm(id) {
  const storm = storms.find(s => s.id === id);
  if (!storm) return;

  selectedId = id;
  trackLayer.clearLayers();

  // Draw coloured line segments so intensity changes are visible along the track.
  for (let i = 1; i < storm.points.length; i++) {
    const a = storm.points[i - 1];
    const b = storm.points[i];
    const style = pointStyle(b);

    L.polyline([[a.lat, a.lon], [b.lat, b.lon]], {
      color: style.color,
      weight: 5,
      opacity: 0.9
    }).addTo(trackLayer);
  }

  storm.points.forEach((p, idx) => {
    const style = pointStyle(p);
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: idx === storm.points.length - 1 ? 6 : 4,
      color: "#07111e",
      weight: 1,
      fillColor: style.color,
      fillOpacity: 1
    }).addTo(trackLayer);

    marker.bindPopup(`
      <div class="popup-title">${escapeHtml(storm.name)} · ${escapeHtml(style.label)}</div>
      <div class="popup-meta">
        ${formatDate(p.date)} ${p.time.slice(0,2)}:${p.time.slice(2)} UTC<br>
        Wind: ${p.wind ?? "—"} kt${p.wind ? ` / ${ktToMph(p.wind)} mph` : ""}<br>
        Pressure: ${p.pressure ? `${p.pressure} hPa` : "—"}<br>
        Position: ${Math.abs(p.lat).toFixed(1)}°${p.lat >= 0 ? "N" : "S"},
        ${Math.abs(p.lon).toFixed(1)}°${p.lon >= 0 ? "E" : "W"}
      </div>
    `);
  });

  const bounds = L.latLngBounds(storm.points.map(p => [p.lat, p.lon]));
  if (bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: 6 });

  $("stormCard").classList.remove("hidden");
  $("stormTitle").textContent = `${storm.name} (${storm.year})`;
  $("stormBasin").textContent = `${storm.basin} · ${storm.id}`;
  $("stormBadge").textContent = storm.maxClass.label;
  $("stormBadge").style.background = storm.maxClass.color;
  $("peakWind").textContent = `${storm.peakWind} kt / ${ktToMph(storm.peakWind)} mph`;
  $("minPressure").textContent = storm.minPressure ? `${storm.minPressure} hPa` : "Not available";
  $("stormDates").textContent =
    `${formatDate(storm.points[0].date)} – ${formatDate(storm.points.at(-1).date)}`;

  renderResults();
}

async function loadData() {
  try {
    const loaded = await Promise.all(DATASETS.map(async ds => {
      const res = await fetch(ds.url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Could not load ${ds.url} (${res.status})`);
      return parseHurdat(await res.text(), ds.basin);
    }));

    storms = loaded.flat();
    filterStorms();

    if (!storms.length) {
      throw new Error("The data files loaded, but no tropical storms were parsed.");
    }
  } catch (err) {
    console.error(err);
    $("status").innerHTML =
      `Data not loaded. Run the included <strong>Update NOAA storm data</strong> GitHub Action, then refresh.`;
  }
}

$("search").addEventListener("input", filterStorms);
$("basinFilter").addEventListener("change", filterStorms);
$("typeFilter").addEventListener("change", filterStorms);
$("closeCard").addEventListener("click", () => $("stormCard").classList.add("hidden"));

loadData();
