const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const cityHistoryEl = document.getElementById("cityHistory");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const errorMessage = document.getElementById("errorMessage");

const CITY_HISTORY_KEY = "cityHistory";
const MAX_CITY_HISTORY = 5;

const weatherCodes = {
  0: "Ясно",
  1: "Переважно ясно",
  2: "Мінлива хмарність",
  3: "Хмарно",
  45: "Туман",
  48: "Паморозь",
  51: "Легка мряка",
  61: "Невеликий дощ",
  63: "Дощ",
  65: "Сильний дощ",
  71: "Невеликий сніг",
  73: "Сніг",
  75: "Сильний сніг",
  80: "Зливи",
  95: "Гроза",
};

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 61, 63, 65, 80].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if (code === 95) return "⛈️";
  return "🌡️";
}

function getWeatherTheme(code) {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partly";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 61, 63, 65, 80].includes(code)) return "rain";
  if ([71, 73, 75].includes(code)) return "snow";
  if (code === 95) return "thunder";
  return "default";
}

function applyWeatherTheme(code) {
  document.body.dataset.weather = getWeatherTheme(code);
}

function renderWeatherIcon(code) {
  const el = document.getElementById("weatherIcon");
  if (!el) return;

  const icon = getWeatherIcon(code);

  // Первый раз заменяем <img> на <div>, дальше обновляем текст
  if (el.tagName && el.tagName.toLowerCase() === "img") {
    const iconEl = document.createElement("div");
    iconEl.className = "emoji-icon";
    iconEl.id = "weatherIcon";
    iconEl.textContent = icon;
    el.replaceWith(iconEl);
    return;
  }

  el.classList.add("emoji-icon");
  el.textContent = icon;
}

function loadCityHistory() {
  try {
    const raw = localStorage.getItem(CITY_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((x) => x && typeof x.name === "string")
      .map((x) => ({
        name: x.name.trim(),
        country: typeof x.country === "string" ? x.country.trim() : "",
      }))
      .filter((x) => x.name.length > 0)
      .slice(0, MAX_CITY_HISTORY);
  } catch {
    return [];
  }
}

function saveCityHistory(items) {
  try {
    localStorage.setItem(CITY_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / privacy mode
  }
}

function addCityToHistory(location) {
  const name = (location && location.name ? String(location.name) : "").trim();
  const country = (location && location.country ? String(location.country) : "").trim();
  if (!name) return;

  const key = `${name.toLowerCase()}|${country.toLowerCase()}`;
  const existing = loadCityHistory();
  const next = [{ name, country }].concat(
    existing.filter((x) => `${x.name.toLowerCase()}|${x.country.toLowerCase()}` !== key)
  );

  saveCityHistory(next.slice(0, MAX_CITY_HISTORY));
  renderCityHistory();
}

function renderCityHistory() {
  if (!cityHistoryEl) return;

  const items = loadCityHistory();
  cityHistoryEl.innerHTML = "";

  if (items.length === 0) {
    cityHistoryEl.hidden = true;
    return;
  }

  cityHistoryEl.hidden = false;
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.name;
    btn.title = item.country ? `${item.name}, ${item.country}` : item.name;
    btn.addEventListener("click", () => {
      cityInput.value = item.name;
      getWeather(item.name);
    });
    cityHistoryEl.appendChild(btn);
  }
}

async function getCoordinates(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
    `&count=1&language=uk&format=json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Помилка геокодування");

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("Місто не знайдено");
  }

  return data.results[0];
}

async function getWeatherByLocation(location, persistCityName = true) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}` +
    `&longitude=${location.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&wind_speed_unit=ms&timezone=auto`;

  const response = await fetch(weatherUrl);
  if (!response.ok) throw new Error("Помилка отримання погоди");

  const data = await response.json();
  const current = data.current;
  if (!current) throw new Error("Немає даних про поточну погоду");

  const code = current.weather_code;

  const label = location.country ? `${location.name}, ${location.country}` : location.name;
  cityName.textContent = label;
  temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
  description.textContent = weatherCodes[code] || "Погода";
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${current.wind_speed_10m} м/с`;

  renderWeatherIcon(code);
  applyWeatherTheme(code);

  if (persistCityName) {
    localStorage.setItem("lastCity", location.name);
    addCityToHistory(location);
  }
}

async function getWeather(city) {
  try {
    errorMessage.textContent = "";

    const location = await getCoordinates(city);
    await getWeatherByLocation(location, true);
  } catch (error) {
    errorMessage.textContent = error.message || "Невідома помилка";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    errorMessage.textContent = "Введіть назву міста";
    return;
  }

  getWeather(city);
  cityInput.value = "";
});

const lastCity = localStorage.getItem("lastCity");
renderCityHistory();
getWeather(lastCity || "Kyiv");