/**
 * AWS Location Service Client Wrapper
 * Location-based services
 */

import {
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  SearchPlaceIndexForTextCommand,
  GetMapStyleDescriptorCommand,
} from "@aws-sdk/client-location";
import { awsConfig } from "./config";

export const locationClient = new LocationClient({
  region: awsConfig.region,
});

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  label: string;
  municipality?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Place {
  name: string;
  coordinates: Coordinates;
  address: Address;
  distance?: number;
  placeId?: string;
}

export interface ReverseGeocodeResult {
  places: Place[];
}

export interface ForwardGeocodeResult {
  places: Place[];
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  coordinates: Coordinates,
  indexName: string = process.env.AWS_LOCATION_INDEX_NAME || "default"
): Promise<ReverseGeocodeResult> {
  try {
    const command = new SearchPlaceIndexForPositionCommand({
      IndexName: indexName,
      Position: [coordinates.longitude, coordinates.latitude],
      MaxResults: 5,
    });

    const response = await locationClient.send(command);
    const results = response.Results || [];

    return {
      places: results.map((result) => ({
        name: result.Place?.Label || "",
        coordinates: {
          latitude: result.Place?.Geometry?.Point?.[1] || 0,
          longitude: result.Place?.Geometry?.Point?.[0] || 0,
        },
        address: {
          label: result.Place?.Label || "",
          municipality: result.Place?.Municipality,
          district: result.Place?.SubRegion,
          state: result.Place?.Region,
          country: result.Place?.Country,
          postalCode: result.Place?.PostalCode,
        },
        distance: result.Distance,
        placeId: result.PlaceId,
      })),
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    throw error;
  }
}

/**
 * Forward geocode address to coordinates
 */
export async function forwardGeocode(
  text: string,
  indexName: string = process.env.AWS_LOCATION_INDEX_NAME || "default"
): Promise<ForwardGeocodeResult> {
  try {
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: indexName,
      Text: text,
      MaxResults: 5,
    });

    const response = await locationClient.send(command);
    const results = response.Results || [];

    return {
      places: results.map((result) => ({
        name: result.Place?.Label || "",
        coordinates: {
          latitude: result.Place?.Geometry?.Point?.[1] || 0,
          longitude: result.Place?.Geometry?.Point?.[0] || 0,
        },
        address: {
          label: result.Place?.Label || "",
          municipality: result.Place?.Municipality,
          district: result.Place?.SubRegion,
          state: result.Place?.Region,
          country: result.Place?.Country,
          postalCode: result.Place?.PostalCode,
        },
        distance: result.Distance,
        placeId: result.PlaceId,
      })),
    };
  } catch (error) {
    console.error("Forward geocode error:", error);
    throw error;
  }
}

/**
 * Search for nearby places (requires place index with nearby places enabled)
 */
export async function searchNearbyPlaces(
  coordinates: Coordinates,
  keyword: string,
  indexName: string = process.env.AWS_LOCATION_INDEX_NAME || "default",
  maxResults: number = 10
): Promise<ForwardGeocodeResult> {
  try {
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: indexName,
      Text: keyword,
      BiasPosition: [coordinates.longitude, coordinates.latitude],
      MaxResults: maxResults,
    });

    const response = await locationClient.send(command);
    const results = response.Results || [];

    return {
      places: results.map((result) => ({
        name: result.Place?.Label || "",
        coordinates: {
          latitude: result.Place?.Geometry?.Point?.[1] || 0,
          longitude: result.Place?.Geometry?.Point?.[0] || 0,
        },
        address: {
          label: result.Place?.Label || "",
          municipality: result.Place?.Municipality,
          district: result.Place?.SubRegion,
          state: result.Place?.Region,
          country: result.Place?.Country,
          postalCode: result.Place?.PostalCode,
        },
        distance: result.Distance,
        placeId: result.PlaceId,
      })),
    };
  } catch (error) {
    console.error("Search nearby places error:", error);
    throw error;
  }
}

/**
 * Get map style descriptor for embeddable maps
 */
export async function getMapStyle(
  mapName: string = process.env.AWS_LOCATION_MAP_NAME || "default"
): Promise<string> {
  try {
    const command = new GetMapStyleDescriptorCommand({
      MapName: mapName,
    });

    const response = await locationClient.send(command);
    return (response as any).MapStyleDescriptor || "{}";
  } catch (error) {
    console.error("Get map style error:", error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates (approximation)
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat =
    ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon =
    ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default locationClient;
