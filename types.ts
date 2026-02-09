export type Gender = 'Male' | 'Female';

export interface Participant {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
  mobile: string;
  city: string;
}

export interface Guest {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
}

export interface AccommodationDetails {
  required: boolean;
  memberIds: string[]; // IDs of primary participant or guests
  dates: string[];
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
}

export interface FoodDetails {
  takeawayRequired: boolean;
  packetCount: number;
  pickupDate: string;
  pickupTime: string;
}

export interface RegistrationData {
  id: string; // Unique Registration ID
  submissionDate: string;
  primaryParticipant: Participant;
  attendingDates: string[];
  additionalGuests: Guest[];
  accommodation: AccommodationDetails;
  food: FoodDetails;
  status: 'draft' | 'submitted';
}

export type StepId = 'PRIMARY' | 'ATTENDANCE' | 'GUESTS' | 'ACCOMMODATION' | 'FOOD' | 'REVIEW';
