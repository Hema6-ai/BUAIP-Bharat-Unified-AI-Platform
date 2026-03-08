// Weather Fetcher — EventBridge scheduled Lambda
// Fetches real weather data from OpenWeatherMap and writes to DynamoDB
import { putWeather, WeatherData } from "../shared/dynamodb";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5";

// Major agricultural districts with lat/lon
const LOCATIONS: { state: string; district: string; lat: number; lon: number }[] = [
  { state: "Punjab", district: "Ludhiana", lat: 30.9, lon: 75.85 },
  { state: "Punjab", district: "Amritsar", lat: 31.63, lon: 74.87 },
  { state: "Haryana", district: "Karnal", lat: 29.69, lon: 76.98 },
  { state: "Haryana", district: "Hisar", lat: 29.15, lon: 75.72 },
  { state: "Uttar Pradesh", district: "Lucknow", lat: 26.85, lon: 80.95 },
  { state: "Uttar Pradesh", district: "Varanasi", lat: 25.32, lon: 83.01 },
  { state: "Madhya Pradesh", district: "Indore", lat: 22.72, lon: 75.86 },
  { state: "Madhya Pradesh", district: "Bhopal", lat: 23.26, lon: 77.41 },
  { state: "Maharashtra", district: "Pune", lat: 18.52, lon: 73.86 },
  { state: "Maharashtra", district: "Nagpur", lat: 21.15, lon: 79.09 },
  { state: "Maharashtra", district: "Nashik", lat: 20.0, lon: 73.78 },
  { state: "Rajasthan", district: "Jaipur", lat: 26.92, lon: 75.79 },
  { state: "Rajasthan", district: "Jodhpur", lat: 26.28, lon: 73.02 },
  { state: "Gujarat", district: "Ahmedabad", lat: 23.02, lon: 72.57 },
  { state: "Gujarat", district: "Rajkot", lat: 22.3, lon: 70.8 },
  { state: "Karnataka", district: "Bangalore", lat: 12.97, lon: 77.59 },
  { state: "Karnataka", district: "Belgaum", lat: 15.85, lon: 74.5 },
  { state: "Andhra Pradesh", district: "Guntur", lat: 16.31, lon: 80.44 },
  { state: "Andhra Pradesh", district: "Vijayawada", lat: 16.51, lon: 80.65 },
  { state: "Telangana", district: "Hyderabad", lat: 17.39, lon: 78.49 },
  { state: "Telangana", district: "Warangal", lat: 17.98, lon: 79.6 },
  { state: "Tamil Nadu", district: "Chennai", lat: 13.08, lon: 80.27 },
  { state: "Tamil Nadu", district: "Coimbatore", lat: 11.0, lon: 76.96 },
  { state: "West Bengal", district: "Kolkata", lat: 22.57, lon: 88.36 },
  { state: "Bihar", district: "Patna", lat: 25.6, lon: 85.1 },
  { state: "Odisha", district: "Bhubaneswar", lat: 20.3, lon: 85.82 },
  { state: "Assam", district: "Guwahati", lat: 26.14, lon: 91.74 },
  { state: "Kerala", district: "Kochi", lat: 9.93, lon: 76.27 },
];

interface OWMCurrent {
  main: { temp: number; humidity: number };
  weather: { description: string }[];
  wind: { speed: number };
  rain?: { "1h"?: number; "3h"?: number };
}

function assessRainfallRisk(rainfall: number, forecast7d: string): string {
  if (rainfall > 50) return "High — heavy rainfall, risk of waterlogging";
  if (rainfall > 20) return "Moderate — good for kharif crops";
  if (rainfall > 5) return "Low — light rain expected";
  return "Minimal — consider irrigation";
}

async function fetchWeather(
  lat: number,
  lon: number
): Promise<{ current: any; forecast: string } | null> {
  if (!OPENWEATHER_API_KEY) return null;

  try {
    // Current weather
    const currentRes = await fetch(
      `${OPENWEATHER_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!currentRes.ok) return null;
    const current = (await currentRes.json()) as OWMCurrent;

    // 7-day forecast
    const forecastRes = await fetch(
      `${OPENWEATHER_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&cnt=14`,
      { signal: AbortSignal.timeout(10000) }
    );
    let forecastSummary = "Forecast unavailable";
    if (forecastRes.ok) {
      const fData: any = await forecastRes.json();
      const days = (fData.list || []).slice(0, 7);
      forecastSummary = days
        .map(
          (d: any) =>
            `${new Date(d.dt * 1000).toLocaleDateString("en-IN", { weekday: "short" })}: ${d.main.temp}°C, ${d.weather[0]?.description}`
        )
        .join("; ");
    }

    return { current, forecast: forecastSummary };
  } catch (err) {
    console.error("[WeatherFetcher] Error:", err);
    return null;
  }
}

// ─── Lambda Handler (EventBridge scheduled — every 6 hours) ─────────────────

export async function handler() {
  console.log("[WeatherFetcher] Starting scheduled fetch...");

  let success = 0;
  let errors = 0;

  for (const loc of LOCATIONS) {
    try {
      const data = await fetchWeather(loc.lat, loc.lon);
      if (!data) {
        errors++;
        continue;
      }

      const rainfall =
        data.current.rain?.["1h"] || data.current.rain?.["3h"] || 0;

      const weather: WeatherData = {
        stateDistrict: `${loc.state}#${loc.district}`,
        fetchedAt: new Date().toISOString(),
        temperature: Math.round(data.current.main.temp),
        humidity: data.current.main.humidity,
        rainfall,
        rainfallRisk: assessRainfallRisk(rainfall, data.forecast),
        forecast7Day: data.forecast,
        windSpeed: Math.round(data.current.wind.speed * 3.6), // m/s → km/h
        condition: data.current.weather[0]?.description || "unknown",
      };

      await putWeather(weather);

      // Also write a state-level entry (latest district data)
      await putWeather({
        ...weather,
        stateDistrict: loc.state,
      });

      success++;
    } catch (err) {
      errors++;
      console.error(`[WeatherFetcher] Error for ${loc.state}/${loc.district}:`, err);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[WeatherFetcher] Done. Success: ${success}, Errors: ${errors}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ success, errors, total: LOCATIONS.length }),
  };
}
