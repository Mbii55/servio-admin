// app/admin/verifications/page.tsx
"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "../../../src/context/AuthContext";
import { fetcher } from "../../../src/lib/swr-fetcher";
import DashboardSkeleton from "../../../src/components/ui/DashboardSkeleton";
import { api } from "../../../src/lib/api";

type VerificationStatus = "pending" | "approved" | "rejected" | "resubmitted";
type DocumentType = "commercial_registration" | "trade_license" | "other";

interface Document {
  id: string;
  document_type: DocumentType;
  document_url: string;
  document_name: string;
  file_size: number;
  is_verified: boolean;
  uploaded_at: string;
  rejection_reason?: string | null;
}

interface Verification {
  id: string;
  business_name: string;
  business_logo: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  user_id: string;
  user_email: string;
  user_display_id: string;
  user_first_name: string;
  user_last_name: string;
  documents: Document[];
}

interface VerificationsResponse {
  verifications?: Verification[];
  data?: Verification[];
  error?: string;
}

interface StatsResponse {
  pending: number;
  approved: number;
  rejected: number;
  resubmitted: number;
  total: number;
}

export default function AdminVerificationsPage() {
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<VerificationStatus | "all">("all");
  const [selectedVerification, setSelectedVerification] = React.useState<Verification | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [brokenLogos, setBrokenLogos] = React.useState<Record<string, boolean>>({});

  // Document preview modal state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewName, setPreviewName] = React.useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);

  // Simple SWR key - load all data once
  const verificationsKey = isAdmin ? "/verification/admin/all" : null;
  const statsKey = isAdmin ? "/verification/admin/stats" : null;

  const {
    data: rawData,
    error: verificationsError,
    isLoading: verificationsLoading,
    mutate: mutateVerifications,
  } = useSWR<VerificationsResponse>(verificationsKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    refreshInterval: 60000,
  });

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<StatsResponse>(statsKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });

  const verifications: Verification[] = useMemo(() => {
    const list = rawData?.verifications ?? rawData?.data ?? [];
    return Array.isArray(list) ? list : [];
  }, [rawData]);

  // Enhanced client-side filtering with better search logic
  const filteredVerifications = useMemo(() => {
    let filtered = [...verifications];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => v.verification_status === statusFilter);
    }

    // Search filter - more comprehensive search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Split search terms to allow multiple keywords
      const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
      
      filtered = filtered.filter((verification) => {
        // Create a searchable string with all relevant fields
        const searchableText = `
          ${verification.business_name || ''}
          ${verification.user_email || ''}
          ${verification.user_display_id || ''}
          ${verification.user_first_name || ''} 
          ${verification.user_last_name || ''}
          ${verification.verification_status || ''}
          ${verification.id || ''}
        `.toLowerCase();
        
        // Check if ALL search terms are found in the searchable text
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Sort by creation date (most recent first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [verifications, statusFilter, searchQuery]);

  // Calculate stats based on filtered results
  const filteredStats = useMemo(() => {
    if (searchQuery.trim() || statusFilter !== "all") {
      return {
        pending: filteredVerifications.filter(v => v.verification_status === "pending").length,
        approved: filteredVerifications.filter(v => v.verification_status === "approved").length,
        rejected: filteredVerifications.filter(v => v.verification_status === "rejected").length,
        resubmitted: filteredVerifications.filter(v => v.verification_status === "resubmitted").length,
        total: filteredVerifications.length,
      };
    }
    return statsData || {
      pending: 0,
      approved: 0,
      rejected: 0,
      resubmitted: 0,
      total: 0,
    };
  }, [filteredVerifications, statsData, searchQuery, statusFilter]);

  const stats = filteredStats;

  const displayName = (v: Verification) =>
    `${v.user_first_name || ""} ${v.user_last_name || ""}`.trim() || v.user_email;

  const initials = (v: Verification) => {
    const a = (v.user_first_name || "").trim().charAt(0);
    const b = (v.user_last_name || "").trim().charAt(0);
    const fallback = (v.user_email || "").trim().charAt(0);
    return ((a || fallback) + (b || "")).toUpperCase();
  };

  const getLogo = (v: Verification) => {
    if (brokenLogos[v.id]) return null;
    return v.business_logo || null;
  };

  const loadVerifications = () => mutateVerifications();

  const handleViewDetails = async (verification: Verification) => {
    try {
      const response = await api.get(`/verification/admin/${verification.id}`);
      setSelectedVerification(response.data);
      setShowModal(true);
      setRejectionReason("");
    } catch (error) {
      console.error("Error fetching verification details:", error);
      alert("Failed to load verification details");
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      setIsApproving(true);
      await api.patch(`/verification/admin/${selectedVerification.id}/status`, {
        status: "approved",
      });

      await loadVerifications();
      setShowModal(false);
      setSelectedVerification(null);
    } catch (error: any) {
      console.error("Error approving verification:", error);
      alert(error.response?.data?.error || "Failed to approve verification");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setIsRejecting(true);
      await api.patch(`/verification/admin/${selectedVerification.id}/status`, {
        status: "rejected",
        rejection_reason: rejectionReason,
      });

      await loadVerifications();
      setShowModal(false);
      setSelectedVerification(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting verification:", error);
      alert(error.response?.data?.error || "Failed to reject verification");
    } finally {
      setIsRejecting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

const openDocInModal = async (doc: Document) => {
  setPreviewLoading(true);
  setPreviewOpen(true);
  setPreviewName(doc.document_name);
  setSelectedDocument(doc);

  try {
    // 1) Get signed URL from backend (admin endpoint)
    const resp = await api.get<{ url: string }>(
      `/verification/admin/documents/${doc.id}/view-url`
    );
    const remoteUrl = resp.data?.url;
    if (!remoteUrl) throw new Error("No URL returned from server");

    // 2) Fetch file as blob (this prevents forced-download behavior in iframe)
    const r = await fetch(remoteUrl, { method: "GET" });
    if (!r.ok) throw new Error(`Failed to fetch file (${r.status})`);

    const contentType = r.headers.get("content-type") || "";
    const blob = await r.blob();

    // 3) Detect PDF reliably
    const isPdf =
      contentType.includes("pdf") ||
      (doc.document_name || "").toLowerCase().endsWith(".pdf") ||
      remoteUrl.toLowerCase().includes(".pdf");

    // 4) Force correct PDF mime if Cloudinary returns odd type
    const safeBlob =
      isPdf && blob.type !== "application/pdf"
        ? new Blob([blob], { type: "application/pdf" })
        : blob;

    // 5) Create blob URL for preview
    const blobUrl = URL.createObjectURL(safeBlob);

    // cleanup old blob url if any
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewIsPdf(isPdf);
    setPreviewUrl(blobUrl);
  } catch (e: any) {
    console.error("Failed to open document:", e);
    alert("Could not open document: " + (e?.message || "Unknown error"));
    closePreview();
  } finally {
    setPreviewLoading(false);
  }
};


  // Download document with proper filename
  const downloadDocument = async (doc: Document) => {
    try {
      // Get signed URL
      const resp = await api.get<{ url: string }>(`/verification/admin/documents/${doc.id}/view-url`);
      const remoteUrl = resp.data.url;
      if (!remoteUrl) throw new Error('No URL returned');

      // Fetch the document
      const response = await fetch(remoteUrl);
      if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();

      // Determine file extension
      const defaultExt = contentType.includes('pdf') ? '.pdf' :
                        contentType.includes('png') ? '.png' :
                        contentType.includes('jpeg') ? '.jpg' :
                        contentType.includes('webp') ? '.webp' : '';

      // Clean filename
      let filename = doc.document_name.trim();
      filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').slice(0, 180);
      if (!/\.[a-z0-9]{2,5}$/i.test(filename) && defaultExt) {
        filename += defaultExt;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Failed to download document:", e);
      alert("Could not download document: " + (e.message || "Unknown error"));
    }
  };

  // Close preview modal
 const closePreview = () => {
  setPreviewOpen(false);
  setPreviewIsPdf(false);
  setPreviewName(null);
  setPreviewLoading(false);
  setSelectedDocument(null);

  if (previewUrl && previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
  setPreviewUrl(null);
};

  if (!isAdmin) return null;

  const isLoading = verificationsLoading || statsLoading;
  const error = verificationsError || statsError;

  // Loading state
  if (isLoading) {
    return (
      <>
        <div style={styles.statsGrid}>
          {[1, 2, 3, 4, 5].map((i) => (
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

  // Error state
  if (error && !isLoading) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Failed to Load Verifications</h2>
        <p style={styles.errorMessage}>
          {error.message || "Unable to fetch verifications. Please try again."}
        </p>
        <button onClick={loadVerifications} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Pending"
          value={stats.pending.toLocaleString()}
          icon="⏳"
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
        <StatCard
          title="Approved"
          value={stats.approved.toLocaleString()}
          icon="✅"
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected.toLocaleString()}
          icon="❌"
          gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
        />
        <StatCard
          title="Resubmitted"
          value={stats.resubmitted.toLocaleString()}
          icon="🔄"
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        />
        <StatCard
          title="Total"
          value={stats.total.toLocaleString()}
          icon="📊"
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
        />
      </div>

      {/* Filters and Search - Enhanced with search results info */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          {/* Search */}
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
              placeholder="Search by business name, email, display ID, name, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={styles.clearButton}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4l8 8"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ marginRight: 6 }}
              >
                <path
                  d="M8 2L2 5v3c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V5l-6-3z"
                  stroke="#6B7280"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as VerificationStatus | "all")
              }
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmitted">Resubmitted</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadVerifications}
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
              <path
                d="M4 2v6h6M16 18v-6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.91 8A8 8 0 103.04 12.91"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>
        </div>
        
        {/* Search results info */}
        {(searchQuery || statusFilter !== "all") && (
          <div style={styles.searchResultsInfo}>
            <span style={{ color: "#6B7280", fontSize: 14 }}>
              Showing {filteredVerifications.length} of {verifications.length} verifications
              {searchQuery && (
                <span>
                  {" "}matching "<strong>{searchQuery}</strong>"
                </span>
              )}
              {statusFilter !== "all" && (
                <span>
                  {" "}with status "<strong>{statusFilter}</strong>"
                </span>
              )}
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              style={styles.clearAllButton}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Verifications Table */}
      <div style={styles.tableContainer}>
        {isLoading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading verifications...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <span style={{ fontSize: 48 }}>🔍</span>
            </div>
            <h3 style={styles.emptyTitle}>
              {searchQuery || statusFilter !== "all" 
                ? "No matching verifications found" 
                : "No verifications found"}
            </h3>
            <p style={styles.emptyText}>
              {searchQuery 
                ? "Try different search terms or clear the search" 
                : statusFilter !== "all" 
                  ? "Try a different status filter" 
                  : "No providers have submitted documents yet"}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
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
                  <th style={styles.tableHeader}>Provider</th>
                  <th style={styles.tableHeader}>Business</th>
                  <th style={styles.tableHeader}>Documents</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Submitted</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map((verification) => (
                  <tr key={verification.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div>
                        <div style={styles.userName}>{displayName(verification)}</div>
                        <div style={styles.email}>{verification.user_email}</div>
                        <div style={styles.userId}>ID: {verification.user_display_id}</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.userInfo}>
                        <Avatar
                          url={getLogo(verification)}
                          alt={verification.business_name}
                          initials={initials(verification)}
                          shape="rounded"
                          onError={() =>
                            setBrokenLogos((p) => ({ ...p, [verification.id]: true }))
                          }
                        />
                        <div style={styles.businessName}>{verification.business_name}</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.documentsCount}>
                        {verification.documents?.length || 0} document(s)
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <StatusBadge status={verification.verification_status} />
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.date}>{formatDate(verification.created_at)}</div>
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        onClick={() => handleViewDetails(verification)}
                        style={styles.viewButton}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedVerification && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowModal(false);
            setSelectedVerification(null);
          }}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderContent}>
                <Avatar
                  url={getLogo(selectedVerification)}
                  alt={selectedVerification.business_name}
                  initials={initials(selectedVerification)}
                  size={64}
                  shape="rounded"
                  onError={() =>
                    setBrokenLogos((p) => ({ ...p, [selectedVerification.id]: true }))
                  }
                />
                <div>
                  <h2 style={styles.modalTitle}>{selectedVerification.business_name}</h2>
                  <div style={styles.modalSubtitle}>
                    {displayName(selectedVerification)} • {selectedVerification.user_display_id}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <StatusBadge status={selectedVerification.verification_status} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedVerification(null);
                  setRejectionReason("");
                }}
                style={styles.closeButton}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={styles.modalBody}>
              {/* Provider Info */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0H3z" fill="#6B7280" />
                  </svg>
                  Provider Information
                </h3>
                <div style={styles.detailsGrid}>
                  <DetailItem
                    label="Name"
                    value={`${selectedVerification.user_first_name} ${selectedVerification.user_last_name}`}
                  />
                  <DetailItem label="Email" value={selectedVerification.user_email} />
                  <DetailItem label="Display ID" value={selectedVerification.user_display_id} />
                  <DetailItem
                    label="Registered"
                    value={formatDateTime(selectedVerification.created_at)}
                  />
                </div>
              </div>

              {/* Documents - UPDATED WITH VIEW & DOWNLOAD BUTTONS */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5l-5-4z"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 1v4h4"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Uploaded Documents
                </h3>
                {selectedVerification.documents && selectedVerification.documents.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedVerification.documents.map((doc) => (
                      <div key={doc.id} style={styles.documentCard}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.documentType}>
                            {doc.document_type === "commercial_registration" && "📄 Commercial Registration"}
                            {doc.document_type === "trade_license" && "📜 Trade License"}
                            {doc.document_type === "other" && "📎 Other Document"}
                          </div>
                          <div style={styles.documentInfo}>{doc.document_name}</div>
                          <div style={styles.documentInfo}>
                            {formatFileSize(doc.file_size)} • {formatDateTime(doc.uploaded_at)}
                          </div>
                          {doc.rejection_reason && (
                            <div style={styles.rejectionAlert}>
                              <strong>Rejection:</strong> {doc.rejection_reason}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => openDocInModal(doc)}
                            style={styles.viewDocButton}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="8"
                                cy="8"
                                r="2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => downloadDocument(doc)}
                            style={styles.downloadButton}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M8 2v8m0 0L5 7m3 3l3-3"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyDocuments}>
                    <span style={{ fontSize: 32 }}>📄</span>
                    <p style={{ margin: "8px 0 0 0", color: "#6B7280" }}>
                      No documents uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Rejection Reason Input */}
              {selectedVerification.verification_status !== "approved" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={styles.inputLabel}>
                    Rejection Reason (required if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejection..."
                    rows={4}
                    style={styles.textarea}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedVerification(null);
                  setRejectionReason("");
                }}
                disabled={isApproving || isRejecting}
                style={{
                  ...styles.modalButton,
                  ...styles.modalCancelButton,
                  opacity: (isApproving || isRejecting) ? 0.5 : 1,
                }}
              >
                Cancel
              </button>

              {selectedVerification.verification_status !== "approved" && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={isApproving || isRejecting}
                    style={{
                      ...styles.modalButton,
                      ...styles.modalRejectButton,
                      opacity: (isApproving || isRejecting) ? 0.5 : 1,
                    }}
                  >
                    {isRejecting ? (
                      <>
                        <div style={styles.buttonSpinner} />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M12 4L4 12M4 4l8 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    style={{
                      ...styles.modalButton,
                      ...styles.modalApproveButton,
                      opacity: (isApproving || isRejecting) ? 0.5 : 1,
                    }}
                  >
                    {isApproving ? (
                      <>
                        <div style={styles.buttonSpinner} />
                        Approving...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M13 4L6 11l-3-3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal (like partner portal) */}
      {previewOpen && (
        <div style={styles.previewOverlay}>
          <div style={styles.previewModal}>
            {/* Preview Header */}
            <div style={styles.previewHeader}>
              <div style={{ flex: 1 }}>
                <div style={styles.previewTitle}>{previewName || "Document Preview"}</div>
                <div style={styles.previewSubtitle}>
                  {selectedDocument?.document_type === "commercial_registration" && "Commercial Registration"}
                  {selectedDocument?.document_type === "trade_license" && "Trade License"}
                  {selectedDocument?.document_type === "other" && "Other Document"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedDocument && (
                  <button
                    onClick={() => downloadDocument(selectedDocument)}
                    style={styles.previewDownloadButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 2v8m0 0L5 7m3 3l3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Download
                  </button>
                )}
                <button
                  onClick={closePreview}
                  style={styles.previewCloseButton}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M15 5L5 15M5 5l10 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div style={styles.previewContent}>
              {previewLoading ? (
                <div style={styles.previewLoading}>
                  <div style={styles.spinner} />
                  <p>Loading document...</p>
                </div>
              ) : !previewUrl ? (
                <div style={styles.previewEmpty}>
                  <span style={{ fontSize: 48 }}>📄</span>
                  <p style={{ marginTop: 16 }}>No preview available</p>
                </div>
              ) : previewIsPdf ? (
                <iframe
                  src={previewUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Document Preview"
                />
              ) : (
                <div style={styles.previewImageContainer}>
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    style={styles.previewImage}
                  />
                </div>
              )}
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
  gradient,
}: {
  title: string;
  value: string;
  icon: string;
  gradient: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: gradient }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

function Avatar({
  url,
  alt,
  initials,
  onError,
  size = 48,
  shape = "circle",
}: {
  url: string | null;
  alt: string;
  initials: string;
  onError: () => void;
  size?: number;
  shape?: "circle" | "rounded";
}) {
  const radius = shape === "circle" ? "50%" : 12;

  if (!url) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3B82F6",
          fontWeight: 800,
          fontSize: Math.max(14, Math.floor(size / 3)),
          flexShrink: 0,
        }}
        title={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        border: "2px solid #F3F4F6",
        background: "#fff",
        flexShrink: 0,
      }}
      title={alt}
    >
      <img
        src={url}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={onError}
        referrerPolicy="no-referrer"
      />
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

function StatusBadge({ status }: { status: VerificationStatus }) {
  const colors: Record<
    VerificationStatus,
    { background: string; color: string;}
  > = {
    pending: { background: "#FEF3C7", color: "#D97706", },
    approved: { background: "#ECFDF5", color: "#059669",},
    rejected: { background: "#FEE2E2", color: "#DC2626",},
    resubmitted: { background: "#EFF6FF", color: "#2563EB", },
  };

  return (
    <span
      style={{
        ...styles.badge,
        background: colors[status].background,
        color: colors[status].color,
      }}
    >
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

/* ----------------------------- Styles ----------------------------- */

const styles: Record<string, React.CSSProperties> = {
  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    border: "1px solid #F3F4F6",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: "-0.02em",
  },
  statTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  statCardSkeleton: {
    background: "#F3F4F6",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#E5E7EB",
  },
  skeletonValue: {
    width: "60%",
    height: 28,
    borderRadius: 4,
    background: "#E5E7EB",
  },
  skeletonTitle: {
    width: "80%",
    height: 14,
    borderRadius: 4,
    background: "#E5E7EB",
  },

  // Filters
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
  },

  // Table
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
    transition: "background 0.2s ease",
  },
  tableCell: {
    padding: "20px",
    fontSize: 14,
    verticalAlign: "top",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  userId: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  businessName: {
    fontWeight: "600",
    color: "#111827",
  },
  documentsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  date: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  viewButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
  },

  // Loading/Empty states
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 16,
    color: "#6B7280",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #E5E7EB",
    borderTopColor: "#3B82F6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
  },

  // Error state
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "700",
    color: "#991B1B",
  },
  errorMessage: {
    margin: "0 0 24px 0",
    fontSize: 14,
    color: "#6B7280",
  },
  retryButton: {
    padding: "12px 24px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 900,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottom: "1px solid #F3F4F6",
  },
  modalHeaderContent: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  modalTitle: {
    margin: "0 0 4px 0",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  closeButton: {
    background: "#F3F4F6",
    border: "none",
    width: 36,
    height: 36,
    borderRadius: 8,
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
    gap: 24,
    padding: 24,
    overflowY: "auto",
  },
  modalSection: {
    background: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  modalSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 16px 0",
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  documentCard: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  documentType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  documentInfo: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  rejectionAlert: {
    marginTop: 8,
    padding: 8,
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: 6,
    fontSize: 12,
    color: "#991B1B",
  },
  viewDocButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  downloadButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  emptyDocuments: {
    textAlign: "center",
    padding: 24,
    color: "#6B7280",
  },
  inputLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  textarea: {
    width: "100%",
    padding: 12,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "inherit",
    color: "#111827",
    outline: "none",
    resize: "vertical",
  },
  modalFooter: {
    padding: 24,
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "none",
  },
  modalCancelButton: {
    background: "#F3F4F6",
    color: "#6B7280",
  },
  modalRejectButton: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  modalApproveButton: {
    background: "#ECFDF5",
    color: "#059669",
  },
  buttonSpinner: {
    width: 16,
    height: 16,
    border: "2px solid currentColor",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  // Document Preview Modal Styles (like partner portal)
  previewOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: 20,
  },
  previewModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: "90vw",
  height: "90vh",
  maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  previewDownloadButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
  },
  previewCloseButton: {
    backgroundColor: "#F3F4F6",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6B7280",
  },
  previewContent: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  previewLoading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 16,
    color: "#6B7280",
  },
  previewEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6B7280",
  },
  previewImageContainer: {
    width: "100%",
    height: "100%",
    overflow: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 8,
    border: "1px solid #E5E7EB",
    backgroundColor: "#FFFFFF",
  },

};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input:focus, select:focus, textarea:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  tr:hover {
    background: #F9FAFB;
  }
`;
document.head.appendChild(styleSheet);