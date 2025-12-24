// src/utils/metrics.ts
import { BookingRow, BookingStatus } from "../services/adminDashboard";

export function computeBookingMetrics(bookings: BookingRow[]) {
  const total = bookings.length;

  const byStatus: Record<BookingStatus, number> = {
    pending: 0,
    accepted: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };

  for (const b of bookings) byStatus[b.status]++;

  return { total, byStatus };
}
