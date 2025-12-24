// src/services/adminDashboard.ts
import { api } from "../lib/api";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type BookingRow = {
  id: string;
  status: BookingStatus;
  created_at: string;
  scheduled_date: string;
  scheduled_time: string;
};

export async function fetchAllBookingsForAdmin(): Promise<BookingRow[]> {
  // Admin can list ALL bookings from /bookings/me:contentReference[oaicite:2]{index=2}
  const res = await api.get("/bookings/me");
  return res.data as BookingRow[];
}
