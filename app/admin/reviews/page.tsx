// app/admin/reviews/page.tsx
"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "../../../src/context/AuthContext";
import { fetcher } from "../../../src/lib/swr-fetcher";
import DashboardSkeleton from "../../../src/components/ui/DashboardSkeleton";
import { api } from "../../../src/lib/api";

interface Review {
  id: string;
  booking_id: string;
  booking_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  provider_id: string;
  provider_name: string;
  provider_business_name: string;
  service_id: string;
  service_title: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;

  is_visible?: boolean;
  is_flagged?: boolean;
  flag_reason?: string | null;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
}

interface StatsResponse {
  total: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export default function AdminReviewsPage() {
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState<number | "all">("all");
  const [selectedReview, setSelectedReview] = React.useState<Review | null>(null);
  const [showModal, setShowModal] = React.useState(false);

  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const reviewsKey = isAdmin ? "/reviews/admin/all" : null;
  const statsKey = isAdmin ? "/reviews/admin/stats" : null;

  const {
    data: reviewsData,
    error: reviewsError,
    isLoading: reviewsLoading,
    mutate: mutateReviews,
  } = useSWR<ReviewsResponse>(reviewsKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<StatsResponse>(statsKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });

  const reviews: Review[] = useMemo(() => {
    return Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];
  }, [reviewsData]);

  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    if (ratingFilter !== "all") {
      filtered = filtered.filter((r) => r.rating === ratingFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(query) ||
          r.provider_name.toLowerCase().includes(query) ||
          r.provider_business_name.toLowerCase().includes(query) ||
          r.service_title.toLowerCase().includes(query) ||
          r.booking_number.toLowerCase().includes(query) ||
          (r.comment || "").toLowerCase().includes(query)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [reviews, ratingFilter, searchQuery]);

  const stats = useMemo(() => {
    if (searchQuery || ratingFilter !== "all") {
      const total = filteredReviews.length;
      const avgRating =
        total > 0 ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

      return {
        total,
        average_rating: avgRating,
        five_star: filteredReviews.filter((r) => r.rating === 5).length,
        four_star: filteredReviews.filter((r) => r.rating === 4).length,
        three_star: filteredReviews.filter((r) => r.rating === 3).length,
        two_star: filteredReviews.filter((r) => r.rating === 2).length,
        one_star: filteredReviews.filter((r) => r.rating === 1).length,
      };
    }
    return (
      statsData || {
        total: 0,
        average_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0,
      }
    );
  }, [filteredReviews, statsData, searchQuery, ratingFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const safeErrorMessage = (e: any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || "Something went wrong";

  const refreshAfterAction = async (updatedMaybe?: Partial<Review> | null) => {
    if (updatedMaybe && selectedReview) {
      setSelectedReview({ ...selectedReview, ...updatedMaybe });
    }
    await mutateReviews();
  };

  const handleDeleteReview = async (review: Review) => {
    const ok = window.confirm(
      `Delete this review?\n\nCustomer: ${review.customer_name}\nService: ${review.service_title}\nBooking: #${review.booking_number}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      setActionLoadingId(review.id);
      await api.delete(`/reviews/admin/${review.id}`);

      if (selectedReview?.id === review.id) {
        setShowModal(false);
        setSelectedReview(null);
      }
      await mutateReviews();
    } catch (e) {
      alert(safeErrorMessage(e));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVisibility = async (review: Review) => {
    try {
      setActionLoadingId(review.id);
      const res = await api.patch(`/reviews/admin/${review.id}/visibility`);
      const updated = res?.data?.review || res?.data || null;
      await refreshAfterAction(updated);
    } catch (e) {
      alert(safeErrorMessage(e));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleFlag = async (review: Review) => {
    let reason: string | undefined;
    const isFlagged = !!review.is_flagged;

    if (!isFlagged) {
      const input = window.prompt("Flag reason (required):", "");
      if (input === null) return;
      reason = input.trim();
      if (!reason) {
        alert("Flag reason is required.");
        return;
      }
    }

    try {
      setActionLoadingId(review.id);
      const res = await api.patch(`/reviews/admin/${review.id}/flag`, isFlagged ? {} : { reason });
      const updated = res?.data?.review || res?.data || null;
      await refreshAfterAction(updated);
    } catch (e) {
      alert(safeErrorMessage(e));
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAdmin) return null;

  const isLoading = reviewsLoading || statsLoading;
  const error = reviewsError || statsError;

  if (isLoading) {
    return (
      <>
        <div style={styles.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={styles.statCardSkeleton}>
              <div style={styles.skeletonIcon} />
              <div style={styles.skeletonValue} />
              <div style={styles.skeletonTitle} />
            </div>
          ))}
        </div>
        <DashboardSkeleton />
      </>
    );
  }

  if (error && !isLoading) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>Warning</div>
        <h2 style={styles.errorTitle}>Failed to Load Reviews</h2>
        <p style={styles.errorMessage}>{error.message || "Unable to fetch reviews. Please try again."}</p>
        <button onClick={() => mutateReviews()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  const actionBusy = (id: string) => actionLoadingId === id;

  const truncateComment = (comment: string | null | undefined) => {
    if (!comment) return <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>No comment</span>;
    if (comment.length <= 80) return comment;
    return `${comment.substring(0, 80)}...`;
  };

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? "#F59E0B" : "#E5E7EB"}>
      <path d="M8 2l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L8 11l-3.5 2.5 1.5-4.5-3.5-2.5h4.5z" />
    </svg>
  );

  const RatingDisplay = ({ rating }: { rating: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <StarIcon filled />
      <span style={{ fontWeight: "600", color: "#111827" }}>{rating}.0</span>
    </div>
  );

  return (
    <>
      {/* Simplified & Smaller Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Reviews"
          value={stats.total.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
        />
        <StatCard
          title="Average Rating"
          value={stats.average_rating.toFixed(1)}
          subtitle="out of 5.0"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="5 Stars"
          value={stats.five_star.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#10B981">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="4 Stars"
          value={stats.four_star.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="3 Stars"
          value={stats.three_star.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#6366F1">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <StatCard
          title="1-2 Stars"
          value={(stats.two_star + stats.one_star).toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <path d="M12 2l-3 7-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" />
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          <div style={{ ...styles.searchContainer, flex: "1 1 400px" }}>
            <div style={styles.searchIconWrapper}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  fill="#9CA3AF"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by customer, provider, service, or booking number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={styles.clearButton}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <path
                  d="M8 2l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L8 11l-3.5 2.5 1.5-4.5-3.5-2.5h4.5z"
                  fill="#F59E0B"
                />
              </svg>
              Rating
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
              style={styles.select}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <button
            onClick={() => mutateReviews()}
            disabled={isLoading}
            style={{
              ...styles.refreshButton,
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: isLoading ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            >
              <path d="M4 2v6h6M16 18v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16.91 8A8 8 0 103.04 12.91" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>

        {(searchQuery || ratingFilter !== "all") && (
          <div style={styles.searchResultsInfo}>
            <span style={{ color: "#6B7280", fontSize: 14 }}>
              Showing {filteredReviews.length} of {reviews.length} reviews
              {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
              {ratingFilter !== "all" && <span> with <strong>{ratingFilter} stars</strong></span>}
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setRatingFilter("all");
              }}
              style={styles.clearAllButton}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Reviews Table */}
      <div style={styles.tableContainer}>
        {filteredReviews.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>
              {searchQuery || ratingFilter !== "all" ? "No matching reviews found" : "No reviews yet"}
            </h3>
            <p style={styles.emptyText}>
              {searchQuery || ratingFilter !== "all"
                ? "Try adjusting your filters"
                : "Reviews will appear here once customers start rating services"}
            </p>
            {(searchQuery || ratingFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRatingFilter("all");
                }}
                style={styles.clearFiltersButton}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Customer</th>
                  <th style={styles.tableHeader}>Provider</th>
                  <th style={styles.tableHeader}>Service</th>
                  <th style={styles.tableHeader}>Rating</th>
                  <th style={styles.tableHeader}>Comment</th>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <tr
                    key={review.id}
                    style={{ ...styles.tableRow, cursor: "pointer" }}
                    onClick={() => handleViewDetails(review)}
                  >
                    <td style={styles.tableCell}>
                      <div>
                        <div style={styles.userName}>{review.customer_name}</div>
                        <div style={styles.email}>{review.customer_email}</div>
                      </div>
                    </td>

                    <td style={styles.tableCell}>
                      <div>
                        <div style={styles.providerName}>{review.provider_business_name}</div>
                        <div style={styles.subText}>{review.provider_name}</div>
                      </div>
                    </td>

                    <td style={styles.tableCell}>
                      <div style={styles.serviceTitle}>{review.service_title}</div>
                      <div style={styles.bookingNumber}>#{review.booking_number}</div>
                    </td>

                    <td style={styles.tableCell}>
                      <RatingDisplay rating={review.rating} />
                      {(review.is_flagged || review.is_visible === false) && (
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {review.is_visible === false && <span style={styles.badgeMuted}>Hidden</span>}
                          {review.is_flagged && <span style={styles.badgeDanger}>Flagged</span>}
                        </div>
                      )}
                    </td>

                    <td style={styles.tableCell}>
                      <div style={styles.commentPreview}>{truncateComment(review.comment)}</div>
                    </td>

                    <td style={styles.tableCell}>
                      <div style={styles.date}>{formatDate(review.created_at)}</div>
                    </td>

                    <td style={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                      <button style={styles.viewButton} onClick={() => handleViewDetails(review)}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Details Modal */}
      {showModal && selectedReview && (
        <div style={styles.modalOverlay} onClick={() => { setShowModal(false); setSelectedReview(null); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Review Details</h2>
                <div style={styles.modalSubtitle}>Booking #{selectedReview.booking_number}</div>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedReview(null); }} style={styles.closeButton}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L8 11l-3.5 2.5 1.5-4.5-3.5-2.5h4.5z" fill="#F59E0B" />
                  </svg>
                  Rating
                </h3>
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                    {selectedReview.rating}.0
                  </div>
                  <RatingStars rating={selectedReview.rating} size="large" />
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8 }}>
                    {selectedReview.is_visible === false && <span style={styles.badgeMuted}>Hidden</span>}
                    {selectedReview.is_flagged && <span style={styles.badgeDanger}>Flagged</span>}
                  </div>
                  {selectedReview.is_flagged && selectedReview.flag_reason && (
                    <div style={{ marginTop: 10, color: "#6B7280", fontSize: 13 }}>
                      <strong>Flag reason:</strong> {selectedReview.flag_reason}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0H3z" fill="#6B7280" />
                  </svg>
                  Customer
                </h3>
                <div style={styles.detailsGrid}>
                  <DetailItem label="Name" value={selectedReview.customer_name} />
                  <DetailItem label="Email" value={selectedReview.customer_email} />
                </div>
              </div>

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2a3 3 0 100 6 3 3 0 000-6zM2 14a6 6 0 0112 0" stroke="#6B7280" strokeWidth="1.5" />
                  </svg>
                  Provider
                </h3>
                <div style={styles.detailsGrid}>
                  <DetailItem label="Business" value={selectedReview.provider_business_name} />
                  <DetailItem label="Name" value={selectedReview.provider_name} />
                </div>
              </div>

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="#6B7280" strokeWidth="1.5" />
                  </svg>
                  Service
                </h3>
                <div style={styles.detailsGrid}>
                  <DetailItem label="Service" value={selectedReview.service_title} />
                  <DetailItem label="Booking #" value={selectedReview.booking_number} />
                </div>
              </div>

              <div style={{ ...styles.modalSection, gridColumn: "1 / -1" }}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H8l-3 3v-3H3a1 1 0 01-1-1V3z" stroke="#6B7280" strokeWidth="1.5" />
                  </svg>
                  Comment
                </h3>
                <div style={styles.commentBox}>
                  {selectedReview.comment || (
                    <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>No comment provided</span>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", textAlign: "center", paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Reviewed on {formatDate(selectedReview.created_at)}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={() => handleToggleVisibility(selectedReview)}
                  style={styles.secondaryButton}
                  disabled={actionBusy(selectedReview.id)}
                >
                  {actionBusy(selectedReview.id) ? "..." : selectedReview.is_visible === false ? "Show Review" : "Hide Review"}
                </button>

                <button
                  onClick={() => handleToggleFlag(selectedReview)}
                  style={selectedReview.is_flagged ? styles.warnButton : styles.secondaryButton}
                  disabled={actionBusy(selectedReview.id)}
                >
                  {actionBusy(selectedReview.id) ? "..." : selectedReview.is_flagged ? "Unflag" : "Flag"}
                </button>

                <button
                  onClick={() => handleDeleteReview(selectedReview)}
                  style={styles.dangerButton}
                  disabled={actionBusy(selectedReview.id)}
                >
                  {actionBusy(selectedReview.id) ? "..." : "Delete"}
                </button>

                <button
                  onClick={() => { setShowModal(false); setSelectedReview(null); }}
                  style={styles.modalCloseButton}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------------- Components ----------------------------- */

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>
        {icon}
      </div>
      <div style={styles.statValue}>{value}</div>
      {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

function RatingStars({
  rating,
  size = "normal",
}: {
  rating: number;
  size?: "normal" | "large";
}) {
  const starSize = size === "large" ? 32 : 16;

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={starSize}
          height={starSize}
          viewBox="0 0 16 16"
          fill={star <= rating ? "#F59E0B" : "#E5E7EB"}
        >
          <path d="M8 2l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L8 11l-3.5 2.5 1.5-4.5-3.5-2.5h4.5z" />
        </svg>
      ))}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

/* ----------------------------- Styles ----------------------------- */

const styles: Record<string, React.CSSProperties> = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #E5E7EB",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    textAlign: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#374151",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  statSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -6,
  },
  statTitle: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  statCardSkeleton: {
    background: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#E5E7EB",
  },
  skeletonValue: {
    width: "70%",
    height: 24,
    borderRadius: 4,
    background: "#E5E7EB",
    alignSelf: "center",
  },
  skeletonTitle: {
    width: "80%",
    height: 13,
    borderRadius: 4,
    background: "#E5E7EB",
    alignSelf: "center",
  },

  // Rest of styles remain unchanged (filters, table, modal, etc.)
  filterPanel: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr auto",
    gap: 16,
    alignItems: "end",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIconWrapper: {
    position: "absolute",
    left: 14,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    height: 48,
    paddingLeft: 44,
    paddingRight: 40,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    outline: "none",
    transition: "all 0.2s ease",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  select: {
    height: 48,
    padding: "0 14px",
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    cursor: "pointer",
    outline: "none",
    background: "#FFFFFF",
    transition: "all 0.2s ease",
  },
  refreshButton: {
    height: 48,
    padding: "0 20px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  searchResultsInfo: {
    marginTop: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearAllButton: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 12px",
    borderRadius: 6,
  },

  tableContainer: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000,
  },
  tableHeader: {
    padding: "16px 20px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: "#F9FAFB",
    borderBottom: "2px solid #E5E7EB",
  },
  tableRow: {
    borderTop: "1px solid #F3F4F6",
    transition: "background 0.3s ease",
  },
  tableCell: {
    padding: "20px",
    fontSize: 14,
    verticalAlign: "top",
  },
  userName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#6B7280",
  },
  providerName: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    color: "#6B7280",
  },
  serviceTitle: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  bookingNumber: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  commentPreview: {
    maxWidth: 300,
    color: "#374151",
  },
  date: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  viewButton: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  // ... (rest of styles unchanged – empty state, modal, etc.)
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    fontSize: 15,
    color: "#6B7280",
  },
  clearFiltersButton: {
    marginTop: 20,
    padding: "12px 24px",
    border: "2px solid #3B82F6",
    background: "white",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    cursor: "pointer",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 1000,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 32,
    borderBottom: "1px solid #F3F4F6",
  },
  modalTitle: {
    margin: "0 0 6px 0",
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  closeButton: {
    background: "#F3F4F6",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6B7280",
    transition: "all 0.2s ease",
  },
  modalBody: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
    padding: 32,
    overflowY: "auto",
  },
  modalSection: {
    background: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
  },
  modalSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 20px 0",
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  commentBox: {
    padding: 20,
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 1.7,
    color: "#374151",
    minHeight: 120,
  },
  modalFooter: {
    padding: 32,
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    justifyContent: "center",
  },
  modalCloseButton: {
    padding: "12px 28px",
    border: "none",
    background: "#F3F4F6",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  badgeMuted: {
    background: "#9CA3AF",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: 8,
  },
  badgeDanger: {
    background: "#EF4444",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: 8,
  },

  secondaryButton: {
    padding: "12px 20px",
    border: "none",
    background: "#6B7280",
    color: "#FFFFFF",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  warnButton: {
    padding: "12px 20px",
    border: "none",
    background: "#F97316",
    color: "#FFFFFF",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  dangerButton: {
    padding: "12px 20px",
    border: "none",
    background: "#EF4444",
    color: "#FFFFFF",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  tr:hover {
    background: #F0F9FF !important;
  }
  
  input:focus, select:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15) !important;
  }
`;
document.head.appendChild(styleSheet);