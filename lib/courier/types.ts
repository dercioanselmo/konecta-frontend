// Types for the proposed KONECTA-COURIER-SERVICE — see
// API_REFERENCE_COURIER.md for the full (not-yet-implemented) contract.

export type TransportType = "WALK" | "BICYCLE" | "MOTORCYCLE" | "EBIKE" | "CAR";

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  WALK: "A pé",
  BICYCLE: "Bicicleta",
  MOTORCYCLE: "Mota",
  EBIKE: "e-bike",
  CAR: "Carro",
};

/** Transport types that require a plate number + driving licence on file. */
export const PLATE_REQUIRED_TRANSPORTS: TransportType[] = ["MOTORCYCLE", "CAR"];

export type CourierDocumentType = "BI" | "CARTA_CONDUCAO" | "PASSAPORTE";

export const DOCUMENT_TYPE_LABELS: Record<CourierDocumentType, string> = {
  BI: "Bilhete de Identidade",
  CARTA_CONDUCAO: "Carta de Condução",
  PASSAPORTE: "Passaporte",
};

export type AssociationStatus = "PENDING_STORE_APPROVAL" | "ACTIVE" | "SUSPENDED";

export const ASSOCIATION_STATUS_LABELS: Record<AssociationStatus, string> = {
  PENDING_STORE_APPROVAL: "Pendente aprovação da loja",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
};

export interface CourierProfile {
  userId: string;
  baseLatitude: number;
  baseLongitude: number;
  transportType: TransportType;
  plateNumber: string | null;
  photoUrl: string | null;
}

export interface CourierProfilePayload {
  baseLatitude: number;
  baseLongitude: number;
  transportType: TransportType;
  plateNumber?: string | null;
}

export interface CourierDocument {
  id: string;
  type: CourierDocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace: string;
  fileUrl: string;
}

export interface CreateCourierDocumentPayload {
  type: CourierDocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace: string;
  fileKey: string;
}

export interface CourierShopAssociation {
  shopId: string;
  shopName: string;
  shopLogoUrl: string | null;
  status: AssociationStatus;
  distanceKm: number;
}

/** A shop the courier can request to associate with — from the (proposed) all-shops browse endpoint. */
export interface NearbyShopForCourier {
  id: string;
  name: string;
  logoUrl: string | null;
  isOpen: boolean;
  distanceKm: number;
}

/** Merchant/staff-facing view of one courier's association with their shop. */
export interface ShopCourier {
  courierId: string;
  courierName: string;
  courierPhone: string;
  photoUrl: string | null;
  transportType: TransportType;
  plateNumber: string | null;
  distanceKm: number;
  status: AssociationStatus;
  requestedAt: string;
  /** Returned by Courier Service for the merchant detail map. */
  baseLatitude?: number | null;
  baseLongitude?: number | null;
  baseAddress?: string | null;
  baseCity?: string | null;
  baseNeighborhood?: string | null;
}

/** Same as `ShopCourier` plus the documents the store needs to check before approving. */
export interface ShopCourierDetail extends ShopCourier {
  documents: CourierDocument[];
}
