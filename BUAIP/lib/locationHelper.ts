// Location Helper for ATITHI AI
// Provides city-specific context for better travel guidance

export interface CityContext {
  city: string;
  state: string;
  safetyLevel: 'High' | 'Medium' | 'Low';
  commonScams: string[];
  transportOptions: string[];
  popularAreas: string[];
  emergencyNumbers: {
    police: string;
    ambulance: string;
    touristHelpline?: string;
  };
  airports?: string[];
  bestTimeToVisit: string;
}

const CITY_DATABASE: Record<string, CityContext> = {
  'Delhi': {
    city: 'Delhi',
    state: 'National Capital Territory',
    safetyLevel: 'Medium',
    commonScams: [
      'Taxi drivers refusing to use meter',
      'Fake tour guides near Red Fort and India Gate',
      'Overpriced rickshaws near tourist areas',
      'Commission-based shops ("government approved")'
    ],
    transportOptions: ['Delhi Metro', 'Uber/Ola', 'Auto Rickshaw', 'Bus', 'Airport Express'],
    popularAreas: ['Connaught Place', 'Chandni Chowk', 'Hauz Khas', 'Karol Bagh', 'Paharganj'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '1363, 1800111363'
    },
    airports: ['Indira Gandhi International Airport (DEL)'],
    bestTimeToVisit: 'October to March'
  },
  'Mumbai': {
    city: 'Mumbai',
    state: 'Maharashtra',
    safetyLevel: 'Medium',
    commonScams: [
      'Prepaid taxi scams at airport',
      'Overcharging by auto drivers',
      'Fake charity collectors',
      'Colaba Causeway bargaining traps'
    ],
    transportOptions: ['Mumbai Local Train', 'Mumbai Metro', 'Uber/Ola', 'BEST Bus', 'Auto Rickshaw'],
    popularAreas: ['Colaba', 'Bandra', 'Juhu', 'Andheri', 'Marine Drive', 'Gateway of India'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '022-22838181'
    },
    airports: ['Chhatrapati Shivaji International Airport (BOM)'],
    bestTimeToVisit: 'November to February'
  },
  'Bangalore': {
    city: 'Bangalore',
    state: 'Karnataka',
    safetyLevel: 'High',
    commonScams: [
      'Meter manipulation in autos',
      'Overpriced tours to Nandi Hills',
      'Fake IT job consultants'
    ],
    transportOptions: ['Namma Metro', 'Uber/Ola', 'Auto Rickshaw', 'BMTC Bus'],
    popularAreas: ['MG Road', 'Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '080-22379001'
    },
    airports: ['Kempegowda International Airport (BLR)'],
    bestTimeToVisit: 'September to February'
  },
  'Jaipur': {
    city: 'Jaipur',
    state: 'Rajasthan',
    safetyLevel: 'Medium',
    commonScams: [
      'Gem and jewelry scams',
      'Fake guides at Amber Fort',
      'Camel ride overcharging',
      'Restaurant commission schemes'
    ],
    transportOptions: ['Auto Rickshaw', 'Uber/Ola', 'City Bus', 'Rental Bikes'],
    popularAreas: ['Pink City Old Town', 'MI Road', 'C Scheme', 'Bani Park'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0141-5110598'
    },
    airports: ['Jaipur International Airport (JAI)'],
    bestTimeToVisit: 'October to March'
  },
  'Agra': {
    city: 'Agra',
    state: 'Uttar Pradesh',
    safetyLevel: 'Medium',
    commonScams: [
      'Taj Mahal ticket touts',
      'Fake marble shops',
      'Overpriced guides',
      'Photography scams at monuments'
    ],
    transportOptions: ['Auto Rickshaw', 'Uber/Ola', 'E-rickshaw', 'Cycle Rickshaw'],
    popularAreas: ['Taj Ganj', 'Sadar Bazaar', 'Fatehabad Road'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '1800-1800-100'
    },
    airports: ['Agra Airport (AGR)'],
    bestTimeToVisit: 'October to March'
  },
  'Goa': {
    city: 'Goa',
    state: 'Goa',
    safetyLevel: 'High',
    commonScams: [
      'Beach shack overcharging',
      'Water sports pricing tricks',
      'Taxi cartel (fixed high prices)',
      'Drug-related scams'
    ],
    transportOptions: ['Rented Scooter/Bike', 'Taxi', 'Bus', 'App Cabs (limited)'],
    popularAreas: ['Baga', 'Calangute', 'Anjuna', 'Palolem', 'Panaji', 'Vagator'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0832-2438115'
    },
    airports: ['Dabolim Airport (GOI)', 'Manohar International Airport (GOX)'],
    bestTimeToVisit: 'November to February'
  },
  'Kerala': {
    city: 'Kerala',
    state: 'Kerala',
    safetyLevel: 'High',
    commonScams: [
      'Houseboat pricing variations',
      'Ayurveda treatment quality issues',
      'Overpriced spice shops',
      'Unauthorized tour operators'
    ],
    transportOptions: ['Kerala State Road Transport', 'Auto Rickshaw', 'Taxi', 'Houseboat', 'Train'],
    popularAreas: ['Kochi', 'Munnar', 'Alleppey', 'Kovalam', 'Thekkady', 'Wayanad'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0471-2321132'
    },
    airports: ['Cochin International Airport (COK)', 'Trivandrum Airport (TRV)', 'Calicut Airport (CCJ)'],
    bestTimeToVisit: 'September to March'
  },
  'Varanasi': {
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    safetyLevel: 'Medium',
    commonScams: [
      'Ghat ceremony donation pressure',
      'Silk shop commission scams',
      'Boat ride overcharging',
      'Fake priests and blessings'
    ],
    transportOptions: ['Auto Rickshaw', 'Cycle Rickshaw', 'E-rickshaw', 'Boat (on Ganges)'],
    popularAreas: ['Assi Ghat', 'Dashashwamedh Ghat', 'Godowlia', 'Sigra'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0542-2506670'
    },
    airports: ['Lal Bahadur Shastri Airport (VNS)'],
    bestTimeToVisit: 'October to March'
  },
  'Rishikesh': {
    city: 'Rishikesh',
    state: 'Uttarakhand',
    safetyLevel: 'High',
    commonScams: [
      'Yoga course quality variations',
      'River rafting pricing tricks',
      'Fake spiritual guides',
      'Overpriced guesthouse bookings'
    ],
    transportOptions: ['Auto Rickshaw', 'Shared Taxi', 'Motorcycle Rental', 'Walking'],
    popularAreas: ['Laxman Jhula', 'Ram Jhula', 'Tapovan', 'Swarg Ashram'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0135-2430209'
    },
    airports: ['Jolly Grant Airport, Dehradun (DED) - 35km away'],
    bestTimeToVisit: 'September to November, February to May'
  },
  'Udaipur': {
    city: 'Udaipur',
    state: 'Rajasthan',
    safetyLevel: 'High',
    commonScams: [
      'Artistic painting shop commissions',
      'Boat ride overcharging on Lake Pichola',
      'Hotel booking scams',
      'Fake heritage walk guides'
    ],
    transportOptions: ['Auto Rickshaw', 'Uber/Ola', 'Rental Bike', 'City Bus'],
    popularAreas: ['Lake Pichola', 'Old City', 'Fateh Sagar', 'Sukhadia Circle'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '0294-2411535'
    },
    airports: ['Maharana Pratap Airport (UDR)'],
    bestTimeToVisit: 'September to March'
  },
  'Leh': {
    city: 'Leh',
    state: 'Ladakh',
    safetyLevel: 'High',
    commonScams: [
      'Tour package quality issues',
      'Altitude sickness medication pricing',
      'Overpriced accommodations in peak season',
      'Permit arrangement scams'
    ],
    transportOptions: ['Shared Taxi', 'Motorcycle Rental', 'Private Taxi', 'Bus (limited)'],
    popularAreas: ['Leh Market', 'Changspa', 'Old Town', 'Shanti Stupa Area'],
    emergencyNumbers: {
      police: '100',
      ambulance: '102',
      touristHelpline: '01982-252297'
    },
    airports: ['Kushok Bakula Rimpochee Airport (IXL)'],
    bestTimeToVisit: 'May to September'
  }
};

export function getCityContext(cityName: string): CityContext | null {
  // Normalize city name (case-insensitive search)
  const normalizedCity = cityName.trim();
  
  // Exact match
  if (CITY_DATABASE[normalizedCity]) {
    return CITY_DATABASE[normalizedCity];
  }
  
  // Case-insensitive search
  const cityKey = Object.keys(CITY_DATABASE).find(
    key => key.toLowerCase() === normalizedCity.toLowerCase()
  );
  
  if (cityKey) {
    return CITY_DATABASE[cityKey];
  }
  
  return null;
}

export function getAllCities(): string[] {
  return Object.keys(CITY_DATABASE);
}

export function searchCityByKeyword(keyword: string): CityContext[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(CITY_DATABASE).filter(city => 
    city.city.toLowerCase().includes(lowerKeyword) ||
    city.state.toLowerCase().includes(lowerKeyword) ||
    city.popularAreas.some(area => area.toLowerCase().includes(lowerKeyword))
  );
}
