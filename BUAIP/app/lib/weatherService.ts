/**
 * Weather Service for BUAIP
 * Integrates with OpenWeatherMap API to provide real-time weather data for farmers
 */

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  pressure: number;
  rainfall: number; // in mm
  clouds: number; // percentage
}

interface FarmingAdvice {
  isGoodForFarming: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  advisory: string;
  activities: {
    planting: boolean;
    harvesting: boolean;
    spraying: boolean;
    irrigation: boolean;
  };
}

interface WeatherForecast {
  current: WeatherData;
  forecast5Day: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    description: string;
    rainfall: number;
  }>;
  farmingAdvice: FarmingAdvice;
}

/**
 * Get coordinates for Indian locations
 */
const INDIA_LOCATIONS: Record<string, { lat: number; lon: number; state: string }> = {
  // Punjab
  ludhiana: { lat: 30.9, lon: 75.85, state: 'Punjab' },
  amritsar: { lat: 31.63, lon: 74.87, state: 'Punjab' },
  jalandhar: { lat: 31.33, lon: 75.57, state: 'Punjab' },
  patiala: { lat: 30.34, lon: 76.38, state: 'Punjab' },
  // Haryana
  karnal: { lat: 29.69, lon: 76.99, state: 'Haryana' },
  hisar: { lat: 29.15, lon: 75.72, state: 'Haryana' },
  panipat: { lat: 29.39, lon: 76.97, state: 'Haryana' },
  // Uttar Pradesh
  lucknow: { lat: 26.85, lon: 80.95, state: 'Uttar Pradesh' },
  varanasi: { lat: 25.32, lon: 82.99, state: 'Uttar Pradesh' },
  kanpur: { lat: 26.45, lon: 80.35, state: 'Uttar Pradesh' },
  agra: { lat: 27.18, lon: 78.02, state: 'Uttar Pradesh' },
  // Madhya Pradesh
  indore: { lat: 22.72, lon: 75.86, state: 'Madhya Pradesh' },
  bhopal: { lat: 23.26, lon: 77.41, state: 'Madhya Pradesh' },
  // Maharashtra
  pune: { lat: 18.52, lon: 73.86, state: 'Maharashtra' },
  nagpur: { lat: 21.15, lon: 79.09, state: 'Maharashtra' },
  nashik: { lat: 19.99, lon: 73.79, state: 'Maharashtra' },
  aurangabad: { lat: 19.88, lon: 75.32, state: 'Maharashtra' },
  // Rajasthan
  jaipur: { lat: 26.91, lon: 75.79, state: 'Rajasthan' },
  jodhpur: { lat: 26.28, lon: 73.02, state: 'Rajasthan' },
  udaipur: { lat: 24.59, lon: 73.69, state: 'Rajasthan' },
  // Gujarat
  ahmedabad: { lat: 23.02, lon: 72.57, state: 'Gujarat' },
  rajkot: { lat: 22.3, lon: 70.8, state: 'Gujarat' },
  surat: { lat: 21.17, lon: 72.83, state: 'Gujarat' },
  // Karnataka
  bangalore: { lat: 12.97, lon: 77.59, state: 'Karnataka' },
  belgaum: { lat: 15.85, lon: 74.5, state: 'Karnataka' },
  mysore: { lat: 12.29, lon: 76.64, state: 'Karnataka' },
  // Andhra Pradesh
  guntur: { lat: 16.31, lon: 80.44, state: 'Andhra Pradesh' },
  vijayawada: { lat: 16.51, lon: 80.62, state: 'Andhra Pradesh' },
  visakhapatnam: { lat: 17.69, lon: 83.21, state: 'Andhra Pradesh' },
  // Telangana
  hyderabad: { lat: 17.38, lon: 78.48, state: 'Telangana' },
  warangal: { lat: 17.97, lon: 79.6, state: 'Telangana' },
  nizamabad: { lat: 18.67, lon: 78.1, state: 'Telangana' },
  // Tamil Nadu
  chennai: { lat: 13.08, lon: 80.27, state: 'Tamil Nadu' },
  coimbatore: { lat: 11.01, lon: 76.96, state: 'Tamil Nadu' },
  madurai: { lat: 9.92, lon: 78.12, state: 'Tamil Nadu' },
  // West Bengal
  kolkata: { lat: 22.57, lon: 88.36, state: 'West Bengal' },
  // Bihar
  patna: { lat: 25.59, lon: 85.14, state: 'Bihar' },
  // Odisha
  bhubaneswar: { lat: 20.27, lon: 85.84, state: 'Odisha' },
  // Assam
  guwahati: { lat: 26.18, lon: 91.75, state: 'Assam' },
  // Kerala
  kochi: { lat: 9.93, lon: 76.27, state: 'Kerala' },
  thiruvananthapuram: { lat: 8.52, lon: 76.93, state: 'Kerala' },
};

/**
 * Find coordinates for a location (supports city or state names)
 */
function findLocationCoordinates(location: string): { lat: number; lon: number } | null {
  const locationLower = location.toLowerCase().trim().replace(/\s+/g, '');

  // Direct city match
  if (INDIA_LOCATIONS[locationLower]) {
    return INDIA_LOCATIONS[locationLower];
  }

  // Search by state name
  const stateMatch = Object.entries(INDIA_LOCATIONS).find(([, data]) =>
    data.state.toLowerCase().replace(/\s+/g, '') === locationLower
  );

  if (stateMatch) {
    return stateMatch[1];
  }

  // Partial match
  const partialMatch = Object.entries(INDIA_LOCATIONS).find(([key]) =>
    key.includes(locationLower) || locationLower.includes(key)
  );

  if (partialMatch) {
    return partialMatch[1];
  }

  return null;
}

/**
 * Analyze weather data and provide farming advice
 */
function analyzeFarmingConditions(weather: WeatherData): FarmingAdvice {
  const { temperature, humidity, rainfall, windSpeed } = weather;

  let isGoodForFarming = true;
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let advisory = '';
  const activities = {
    planting: true,
    harvesting: true,
    spraying: true,
    irrigation: true,
  };

  // Temperature analysis
  if (temperature > 42) {
    riskLevel = 'critical';
    isGoodForFarming = false;
    advisory += 'Extreme heat warning. Avoid all outdoor farming activities. Ensure adequate irrigation for existing crops. ';
    activities.planting = false;
    activities.harvesting = false;
    activities.spraying = false;
  } else if (temperature > 38) {
    riskLevel = 'high';
    advisory += 'Very hot weather. Increase irrigation frequency. Avoid spraying during midday. ';
    activities.spraying = false;
  } else if (temperature < 5) {
    riskLevel = 'high';
    advisory += 'Frost warning. Protect sensitive crops. Monitor for frost damage. ';
    activities.planting = false;
  }

  // Rainfall analysis
  if (rainfall > 50) {
    riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    isGoodForFarming = false;
    advisory += 'Heavy rainfall expected. Ensure proper drainage. Avoid pesticide application. Delay harvesting if possible. ';
    activities.spraying = false;
    activities.harvesting = false;
    activities.planting = false;
  } else if (rainfall > 20) {
    riskLevel = riskLevel === 'critical' || riskLevel === 'high' ? riskLevel : 'moderate';
    advisory += 'Moderate rainfall expected. Good for kharif crops. Check field drainage. ';
    activities.irrigation = false;
  } else if (rainfall > 5) {
    advisory += 'Light rainfall expected. Good conditions for most crops. ';
    activities.irrigation = false;
  }

  // Wind analysis
  if (windSpeed > 40) {
    riskLevel = 'high';
    advisory += 'Strong winds expected. Secure loose items. Delay spraying operations. ';
    activities.spraying = false;
  }

  // Humidity analysis
  if (humidity > 85 && temperature > 25) {
    riskLevel = riskLevel === 'low' ? 'moderate' : riskLevel;
    advisory += 'High humidity increases disease risk. Monitor crops for fungal infections. ';
  }

  // Good conditions
  if (
    temperature >= 20 &&
    temperature <= 35 &&
    rainfall === 0 &&
    humidity < 80 &&
    windSpeed < 15
  ) {
    advisory = 'Excellent weather for farming activities. Good conditions for planting, harvesting, and spraying. ';
    riskLevel = 'low';
    isGoodForFarming = true;
  }

  // Default good conditions if no risk factors
  if (!advisory) {
    advisory = 'Weather conditions are suitable for normal farming activities. ';
    riskLevel = 'low';
  }

  return {
    isGoodForFarming,
    riskLevel,
    advisory: advisory.trim(),
    activities,
  };
}

/**
 * Fetch weather data from OpenWeatherMap API
 * @param location City or state name in India
 * @returns Weather data with farming advice, or null if API key not configured
 */
export async function getWeatherData(location: string): Promise<WeatherForecast | null> {
  try {
    const apiKey =
      process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ||
      process.env.OPENWEATHER_API_KEY ||
      process.env.WEATHER ||
      process.env.weather;

    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === '') {
      console.warn('OpenWeatherMap API key not configured. Weather data unavailable.');
      return null;
    }

    const coords = findLocationCoordinates(location);

    if (!coords) {
      console.warn(`Location not found: ${location}`);
      return null;
    }

    // Fetch current weather
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`;
    const currentResponse = await fetch(currentWeatherUrl);

    if (!currentResponse.ok) {
      console.error('Failed to fetch current weather:', await currentResponse.text());
      return null;
    }

    const currentData = await currentResponse.json();

    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      console.error('Failed to fetch forecast:', await forecastResponse.text());
      return null;
    }

    const forecastData = await forecastResponse.json();

    // Process current weather
    const currentWeather: WeatherData = {
      temperature: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      pressure: currentData.main.pressure,
      rainfall: currentData.rain ? currentData.rain['1h'] || 0 : 0,
      clouds: currentData.clouds.all,
    };

    // Process 5-day forecast (group by day)
    const dailyForecasts: Array<{
      date: string;
      temp_max: number;
      temp_min: number;
      description: string;
      rainfall: number;
    }> = [];

    const forecastByDay: Record<string, any> = {};

    forecastData.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];

      if (!forecastByDay[date]) {
        forecastByDay[date] = {
          temps: [],
          descriptions: [],
          rainfall: 0,
        };
      }

      forecastByDay[date].temps.push(item.main.temp);
      forecastByDay[date].descriptions.push(item.weather[0].description);
      if (item.rain && item.rain['3h']) {
        forecastByDay[date].rainfall += item.rain['3h'];
      }
    });

    Object.entries(forecastByDay).forEach(([date, data]: [string, any]) => {
      dailyForecasts.push({
        date,
        temp_max: Math.round(Math.max(...data.temps)),
        temp_min: Math.round(Math.min(...data.temps)),
        description: data.descriptions[0], // Use first description of the day
        rainfall: Math.round(data.rainfall),
      });
    });

    // Generate farming advice
    const farmingAdvice = analyzeFarmingConditions(currentWeather);

    return {
      current: currentWeather,
      forecast5Day: dailyForecasts.slice(0, 5),
      farmingAdvice,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Format weather data for LLM context
 */
export function formatWeatherForLLM(weather: WeatherForecast, location: string): string {
  const { current, forecast5Day, farmingAdvice } = weather;

  let context = `\n=== REAL-TIME WEATHER DATA FOR ${location.toUpperCase()} ===\n\n`;

  // Current conditions
  context += `Current Weather:\n`;
  context += `- Temperature: ${current.temperature}°C (Feels like ${current.feelsLike}°C)\n`;
  context += `- Conditions: ${current.description}\n`;
  context += `- Humidity: ${current.humidity}%\n`;
  context += `- Wind Speed: ${current.windSpeed} km/h\n`;
  if (current.rainfall > 0) {
    context += `- Rainfall: ${current.rainfall}mm\n`;
  }
  context += `\n`;

  // 5-day forecast
  context += `5-Day Forecast:\n`;
  forecast5Day.forEach((day, index) => {
    const dayLabel = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`;
    context += `${dayLabel} (${day.date}): ${day.temp_min}°C - ${day.temp_max}°C, ${day.description}`;
    if (day.rainfall > 0) {
      context += `, rainfall ${day.rainfall}mm`;
    }
    context += `\n`;
  });
  context += `\n`;

  // Farming advice
  context += `Farming Advisory (Risk Level: ${farmingAdvice.riskLevel.toUpperCase()}):\n`;
  context += `${farmingAdvice.advisory}\n\n`;

  context += `Recommended Activities:\n`;
  context += `- Planting: ${farmingAdvice.activities.planting ? '✓ Safe' : '✗ Not recommended'}\n`;
  context += `- Harvesting: ${farmingAdvice.activities.harvesting ? '✓ Safe' : '✗ Not recommended'}\n`;
  context += `- Spraying: ${farmingAdvice.activities.spraying ? '✓ Safe' : '✗ Not recommended'}\n`;
  context += `- Irrigation: ${farmingAdvice.activities.irrigation ? '✓ Needed' : '✗ Not needed'}\n`;

  context += `\n=== END WEATHER DATA ===\n`;

  return context;
}

/**
 * Get weather-specific crop advice based on current conditions
 */
export function getWeatherBasedCropAdvice(
  weather: WeatherForecast,
  crop?: string
): string {
  const { current, farmingAdvice } = weather;
  let advice = '';

  if (farmingAdvice.riskLevel === 'critical') {
    advice = `URGENT: ${farmingAdvice.advisory} Postpone all non-essential farming work until conditions improve.`;
  } else if (farmingAdvice.riskLevel === 'high') {
    advice = `WARNING: ${farmingAdvice.advisory}`;
  } else if (farmingAdvice.riskLevel === 'moderate') {
    advice = `CAUTION: ${farmingAdvice.advisory}`;
  } else {
    advice = `${farmingAdvice.advisory}`;
  }

  // Add crop-specific advice if crop is mentioned
  if (crop) {
    const cropLower = crop.toLowerCase();
    if (current.temperature > 35 && ['wheat', 'rice', 'paddy'].includes(cropLower)) {
      advice += ` For ${crop}, ensure adequate irrigation during hot weather to prevent yield loss.`;
    }
    if (current.rainfall > 20 && ['cotton', 'wheat'].includes(cropLower)) {
      advice += ` Heavy rain can damage ${crop} crops. Ensure proper drainage.`;
    }
  }

  return advice;
}
