export type Unit = {
  id: string;
  name: string;
  group: string;
  beds: number;
  max: number;
  note: string;
  order: number;
  /** "YYYY-MM-DD/YYYY-MM-DD" (Abreisetag exklusiv), Fremdbuchungen laut rugenhof.de */
  blocked: string[];
  asOf: string;
};

export type Stay = {
  id: string;
  name: string;
  persons: number;
  from: string;
  to: string;
  note: string;
  manual: boolean;
};

export type WeddingConfig = { weddingFrom: string; weddingTo: string };
/** stay_id → unit_id */
export type PlanMap = Record<string, string>;
export type Release = { released: boolean; map: PlanMap };

export type PublicData = {
  units: Unit[];
  stays: Stay[];
  config: WeddingConfig;
  release: Release;
};

export type StayInput = Omit<Stay, "manual"> & { secret: string };
export type AdminStayInput = Omit<Stay, "manual"> & { manual: boolean };

export type RideKind = "offer" | "request";
export type Direction = "hin" | "rueck" | "beide";

export type Ride = {
  id: string;
  kind: RideKind;
  name: string;
  origin: string;
  direction: Direction;
  dayOut: string | null;
  dayBack: string | null;
  timeNote: string;
  /** offer: Plätze für Mitfahrende; request: gesuchte Plätze */
  seats: number;
  contact: string;
  note: string;
  updatedAt: string;
};

export type Passenger = {
  id: string;
  rideId: string;
  name: string;
  persons: number;
  contact: string;
  note: string;
};

export type RideData = { rides: Ride[]; passengers: Passenger[] };
export type RideInput = Omit<Ride, "updatedAt"> & { secret: string };
export type PassengerInput = Passenger & { secret: string };

export interface Api {
  readonly demo: boolean;
  hasSession(): Promise<boolean>;
  isAdmin(): Promise<boolean>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  loadPublic(): Promise<PublicData>;
  loadPlan(): Promise<PlanMap>;
  saveStay(e: StayInput): Promise<void>;
  deleteStay(id: string, secret: string): Promise<void>;
  adminSaveStay(e: AdminStayInput): Promise<void>;
  adminDeleteStay(id: string): Promise<void>;
  setAssignment(stayId: string, unitId: string | null): Promise<void>;
  setRelease(released: boolean, map: PlanMap): Promise<void>;
  saveConfig(c: WeddingConfig): Promise<void>;
  saveUnit(u: Unit): Promise<void>;
  deleteUnit(id: string): Promise<void>;

  loadRides(): Promise<RideData>;
  saveRide(r: RideInput): Promise<void>;
  deleteRide(id: string, secret: string): Promise<void>;
  joinRide(p: PassengerInput): Promise<void>;
  leaveRide(id: string, secret: string): Promise<void>;
  adminDeleteRide(id: string): Promise<void>;
  adminDeletePassenger(id: string): Promise<void>;
}
