import * as Location from "expo-location";

export const RESTAURANT = {
  name: "Mezbaan Restro",
  lat: 28.554038,
  lng: 77.2974552,
  radiusKm: 5,
};

export type ServiceabilityStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "denied"; canAskAgain: boolean }
  | { state: "ok"; lat: number; lng: number; distance_km: number; zone_name: string }
  | { state: "out_of_zone"; lat: number; lng: number; distance_km: number }
  | { state: "error"; message: string };

/**
 * Fetch current permission status without prompting.
 */
export async function getLocationPermission(): Promise<Location.PermissionResponse> {
  return Location.getForegroundPermissionsAsync();
}

/**
 * Request permission ONCE. Caller must handle canAskAgain externally.
 */
export async function requestLocationPermission(): Promise<Location.PermissionResponse> {
  return Location.requestForegroundPermissionsAsync();
}

export async function fetchCurrentPosition() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
