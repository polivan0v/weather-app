const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const errorMessage = document.getElementById("errorMessage");

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

async function getWeather(city) {
  try {
    errorMessage.textContent = "";

    const location = await getCoordinates(city);

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

    cityName.textContent = `${location.name}, ${location.country}`;
    temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
    description.textContent = weatherCodes[code] || "Погода";
    humidity.textContent = `${current.relative_humidity_2m}%`;
    wind.textContent = `${current.wind_speed_10m} м/с`;

    renderWeatherIcon(code);
    applyWeatherTheme(code);

    localStorage.setItem("lastCity", city);
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
getWeather(lastCity || "Kyiv");