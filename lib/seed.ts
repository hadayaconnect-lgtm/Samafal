import type { Driver, State } from "./types";

const JOINED = 1761955200000;

function d(
  id: string,
  name: string,
  phone: string,
  plate: string,
  vehicle: string,
  lat: number,
  lng: number,
  opts: Partial<Driver> = {},
): Driver {
  return {
    id,
    name,
    phone,
    plate,
    vehicle,
    lat,
    lng,
    verified: true,
    suspended: false,
    available: true,
    rating: 4.8,
    rides: 0,
    joinedAt: JOINED,
    walletOperator: "D-Money",
    walletNumber: phone,
    ...opts,
  };
}

/** Données de démonstration (chauffeurs fictifs). */
export const SEED: State = {
  drivers: [
    d("d1", "Abdourahman Ali", "+253 77 00 01 01", "DJ-1101", "Toyota Corolla", 11.589, 43.1462),
    d("d2", "Mohamed Houssein", "+253 77 00 01 02", "DJ-1102", "Toyota Yaris", 11.5921, 43.1431, { walletOperator: "Waafi" }),
    d("d3", "Ahmed Omar", "+253 77 00 01 03", "DJ-1103", "Suzuki Alto", 11.5849, 43.1488),
    d("d4", "Said Idriss", "+253 77 00 01 04", "DJ-1104", "Hyundai Accent", 11.5951, 43.1521, { walletOperator: "Waafi" }),
    d("d5", "Moussa Robleh", "+253 77 00 01 05", "DJ-1105", "Toyota Corolla", 11.5803, 43.1402),
    d("d6", "Hassan Dirir", "+253 77 00 01 06", "DJ-1106", "Toyota Vitz", 11.6012, 43.138),
    d("d7", "Ibrahim Aden", "+253 77 00 01 07", "DJ-1107", "Nissan Sunny", 11.5738, 43.1359),
    d("d8", "Abdi Warsama", "+253 77 00 01 08", "DJ-1108", "Toyota Yaris", 11.5603, 43.1527, { walletOperator: "Waafi" }),
    d("d9", "Yonis Daher", "+253 77 00 01 09", "DJ-1109", "Suzuki Swift", 11.5368, 43.1043),
    d("d10", "Kadar Ismaël", "+253 77 00 01 10", "DJ-1110", "Toyota Corolla", 11.5412, 43.1121, { available: false }),
    d("d11", "Djama Bouh", "+253 77 00 01 11", "DJ-1111", "Hyundai i10", 11.6068, 43.1604, { verified: false, available: false }),
    d("d12", "Fouad Rayaleh", "+253 77 00 01 12", "DJ-1112", "Toyota Yaris", 11.5862, 43.1411, { available: false }),
  ],
  rides: [],
};
