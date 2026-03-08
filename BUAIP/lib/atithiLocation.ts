// ATITHI Location Intelligence Helper
// Provides nearby services and location-specific guidance

export interface LocationService {
  city: string;
  hospitals: Array<{
    name: string;
    type: 'government' | 'private';
    address: string;
    phone: string;
  }>;
  policeStations: Array<{
    name: string;
    address: string;
    phone: string;
  }>;
  atms: Array<{
    name: string;
    location: string;
  }>;
  touristPlaces: Array<{
    name: string;
    area: string;
  }>;
  transport: Array<{
    type: string;
    note: string;
  }>;
}

export interface NearbyService {
  serviceType: 'hospital' | 'police' | 'atm' | 'tourist' | 'transport';
  results: string[];
  instructions?: string;
  emergencyNumber?: string;
}

import servicesData from '@/data/indiaServices.json';

export function getNearbyServices(
  city: string,
  serviceType: 'hospital' | 'police' | 'atm' | 'tourist' | 'transport'
): NearbyService | null {
  // Find city data (case-insensitive)
  const cityData = (servicesData as LocationService[]).find(
    (data: LocationService) => data.city.toLowerCase() === city.toLowerCase()
  );

  if (!cityData) {
    return null;
  }

  const response: NearbyService = {
    serviceType,
    results: []
  };

  switch (serviceType) {
    case 'hospital':
      response.results = cityData.hospitals.map(h => 
        `${h.name} (${h.type === 'government' ? 'Government' : 'Private'}) - ${h.address} - ${h.phone}`
      );
      response.instructions = 'In emergencies, call 102 for ambulance service. Most hospitals have emergency departments open 24/7.';
      response.emergencyNumber = '102 (Ambulance)';
      break;

    case 'police':
      response.results = cityData.policeStations.map(p => 
        `${p.name} - ${p.address} - ${p.phone}`
      );
      response.instructions = 'For emergencies, always dial 100 (Police Emergency). For theft or lost items, file FIR at nearest station.';
      response.emergencyNumber = '100 (Police)';
      break;

    case 'atm':
      response.results = cityData.atms.map(a => 
        `${a.name} near ${a.location}`
      );
      response.instructions = 'Most ATMs accept international cards (VISA, Mastercard). Look for "INTERNATIONAL" sign. Carry ID proof.';
      break;

    case 'tourist':
      response.results = cityData.touristPlaces.map(t => 
        `${t.name} (${t.area})`
      );
      response.instructions = 'Always hire official guides. Book tickets online when possible. Avoid street touts.';
      break;

    case 'transport':
      response.results = cityData.transport.map(t => 
        `${t.type}: ${t.note}`
      );
      response.instructions = 'Prefer official transport apps (Ola, Uber, GSRTC buses) over hailing on street.';
      break;
  }

  return response;
}

export function getAllCitiesWithServices(): string[] {
  return (servicesData as LocationService[]).map((data: LocationService) => data.city);
}

export function detectCityInQuestion(question: string): string | null {
  const cities = getAllCitiesWithServices();
  const lowerQuestion = question.toLowerCase();

  for (const city of cities) {
    if (lowerQuestion.includes(city.toLowerCase())) {
      return city;
    }
  }

  return null;
}

export function isEmergencyQuery(question: string): boolean {
  const emergencyKeywords = [
    'hospital',
    'emergency',
    'police',
    'ambulance',
    'lost passport',
    'lost wallet',
    'stolen',
    'accident',
    'injured',
    'sick',
    'fever',
    'robbery',
    'help',
    '114',
    '100',
    '102',
    'crime',
    'attack'
  ];

  const lowerQuestion = question.toLowerCase();
  return emergencyKeywords.some(keyword => lowerQuestion.includes(keyword));
}

export function isTransportQuery(question: string): boolean {
  const transportKeywords = [
    'transport',
    'taxi',
    'auto',
    'metro',
    'bus',
    'train',
    'uber',
    'ola',
    'rickshaw',
    'how to get',
    'travel to',
    'reach',
    'commute'
  ];

  const lowerQuestion = question.toLowerCase();
  return transportKeywords.some(keyword => lowerQuestion.includes(keyword));
}

export function isNearbyQuery(question: string): boolean {
  const nearbyKeywords = [
    'near me',
    'near by',
    'nearby',
    'close by',
    'closest',
    'nearest'
  ];

  const lowerQuestion = question.toLowerCase();
  return nearbyKeywords.some(keyword => lowerQuestion.includes(keyword));
}
