"use client";

import React, { useMemo, useState } from "react";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">("all");
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({});
  const [rejectionError, setRejectionError] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

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

  const filteredVerifications = useMemo(() => {
    let filtered = [...verifications];

    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => v.verification_status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchTerms = query.split(/\s+/).filter((term) => term.length > 0);

      filtered = filtered.filter((verification) => {
        const searchableText = `
          ${verification.business_name || ""}
          ${verification.user_email || ""}
          ${verification.user_display_id || ""}
          ${verification.user_first_name || ""}
          ${verification.user_last_name || ""}
          ${verification.verification_status || ""}
          ${verification.id || ""}
        `.toLowerCase();

        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [verifications, statusFilter, searchQuery]);

  const filteredStats = useMemo(() => {
    if (searchQuery.trim() || statusFilter !== "all") {
      return {
        pending: filteredVerifications.filter((v) => v.verification_status === "pending").length,
        approved: filteredVerifications.filter((v) => v.verification_status === "approved").length,
        rejected: filteredVerifications.filter((v) => v.verification_status === "rejected").length,
        resubmitted: filteredVerifications.filter((v) => v.verification_status === "resubmitted").length,
        total: filteredVerifications.length,
      };
    }
    return statsData || { pending: 0, approved: 0, rejected: 0, resubmitted: 0, total: 0 };
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
      setRejectionError(""); // ✅ clear any old error when opening modal
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
      setRejectionReason("");
      setRejectionError("");
    } catch (error: any) {
      console.error("Error approving verification:", error);
      alert(error.response?.data?.error || "Failed to approve verification");
    } finally {
      setIsApproving(false);
    }
  };

  // ✅ reject button should be clickable even if reason empty (so error UI can show)
  const handleReject = async () => {
    if (!selectedVerification) return;

    if (!rejectionReason.trim()) {
      setRejectionError("Please provide a rejection reason before rejecting.");
      return;
    }

    setRejectionError("");

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
      setRejectionError("");
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
      const resp = await api.get<{ url: string }>(`/verification/admin/documents/${doc.id}/view-url`);
      const remoteUrl = resp.data?.url;
      if (!remoteUrl) throw new Error("No URL returned from server");

      const r = await fetch(remoteUrl, { method: "GET" });
      if (!r.ok) throw new Error(`Failed to fetch file (${r.status})`);

      const contentType = r.headers.get("content-type") || "";
      const blob = await r.blob();

      const isPdf =
        contentType.includes("pdf") ||
        (doc.document_name || "").toLowerCase().endsWith(".pdf") ||
        remoteUrl.toLowerCase().includes(".pdf");

      const safeBlob =
        isPdf && blob.type !== "application/pdf"
          ? new Blob([blob], { type: "application/pdf" })
          : blob;

      const blobUrl = URL.createObjectURL(safeBlob);

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

  const downloadDocument = async (doc: Document) => {
    try {
      const resp = await api.get<{ url: string }>(`/verification/admin/documents/${doc.id}/view-url`);
      const remoteUrl = resp.data.url;
      if (!remoteUrl) throw new Error("No URL returned");

      const response = await fetch(remoteUrl);
      if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);

      const contentType = response.headers.get("content-type") || "";
      const blob = await response.blob();

      const defaultExt = contentType.includes("pdf")
        ? ".pdf"
        : contentType.includes("png")
        ? ".png"
        : contentType.includes("jpeg")
        ? ".jpg"
        : contentType.includes("webp")
        ? ".webp"
        : "";

      let filename = doc.document_name.trim();
      filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, 180);
      if (!/\.[a-z0-9]{2,5}$/i.test(filename) && defaultExt) {
        filename += defaultExt;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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

  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-14 h-14 bg-gray-200 rounded-xl animate-pulse mb-4" />
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
        <DashboardSkeleton />
      </>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Verifications</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          {(error as any)?.message || "Unable to fetch verifications. Please check your connection and try again."}
        </p>
        <button
          onClick={loadVerifications}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
        <StatCard
          title="Pending Review"
          value={stats.pending.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          title="Approved"
          value={stats.approved.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="from-red-500 to-red-600"
        />
        <StatCard
          title="Resubmitted"
          value={stats.resubmitted.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Submissions"
          value={stats.total.toLocaleString()}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by business, email, name, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6 6a1 1 0 00-.293.707V20a1 1 0 01-1.414.586L10 18.414A1 1 0 019.707 18V14a1 1 0 00-.293-.707l-6-6A1 1 0 013 6.586V4z" />
              </svg>
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | "all")}
              className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmitted">Resubmitted</option>
            </select>
          </div>

          <button
            onClick={loadVerifications}
            disabled={isLoading}
            className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <svg className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {(searchQuery || statusFilter !== "all") && (
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <strong>{filteredVerifications.length}</strong> of <strong>{verifications.length}</strong> verifications
              {searchQuery && (
                <>
                  {" "}
                  matching "<strong>{searchQuery}</strong>"
                </>
              )}
              {statusFilter !== "all" && (
                <>
                  {" "}
                  with status "<strong>{statusFilter}</strong>"
                </>
              )}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Verifications Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredVerifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all" ? "No matching verifications" : "No verifications yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No providers have submitted verification documents yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVerifications.map((verification) => (
                  <tr key={verification.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-5">
                      <div>
                        <div className="font-semibold text-gray-900">{displayName(verification)}</div>
                        <div className="text-sm text-gray-600">{verification.user_email}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {verification.user_display_id}</div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar
                          url={getLogo(verification)}
                          alt={verification.business_name}
                          initials={initials(verification)}
                          onError={() => setBrokenLogos((p) => ({ ...p, [verification.id]: true }))}
                        />
                        <div className="font-medium text-gray-900">{verification.business_name}</div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="text-sm font-medium text-gray-700">
                        {verification.documents?.length || 0} document{verification.documents?.length !== 1 ? "s" : ""}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <StatusBadge status={verification.verification_status} />
                    </td>

                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-700">{formatDate(verification.created_at)}</div>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleViewDetails(verification)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowModal(false);
            setSelectedVerification(null);
            setRejectionReason("");
            setRejectionError("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-6">
                  <Avatar
                    url={getLogo(selectedVerification)}
                    alt={selectedVerification.business_name}
                    initials={initials(selectedVerification)}
                    size={72}
                    onError={() => setBrokenLogos((p) => ({ ...p, [selectedVerification.id]: true }))}
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedVerification.business_name}</h2>
                    <p className="text-gray-600 mt-1">
                      {displayName(selectedVerification)} • ID: {selectedVerification.user_display_id}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={selectedVerification.verification_status} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedVerification(null);
                    setRejectionReason("");
                    setRejectionError("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Provider Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Name</div>
                    <div className="font-semibold">{`${selectedVerification.user_first_name} ${selectedVerification.user_last_name}`}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Email</div>
                    <div className="font-semibold">{selectedVerification.user_email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Display ID</div>
                    <div className="font-semibold">{selectedVerification.user_display_id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Submitted</div>
                    <div className="font-semibold">{formatDateTime(selectedVerification.created_at)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Uploaded Documents
                </h3>

                {selectedVerification.documents?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedVerification.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {doc.document_type === "commercial_registration" && "Commercial Registration"}
                            {doc.document_type === "trade_license" && "Trade License"}
                            {doc.document_type === "other" && "Other Document"}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 truncate" title={doc.document_name}>
                            {doc.document_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatFileSize(doc.file_size)} • {formatDateTime(doc.uploaded_at)}
                          </div>

                          {doc.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <strong>Rejection reason:</strong> {doc.rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => openDocInModal(doc)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>

                          <button
                            onClick={() => downloadDocument(doc)}
                            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    No documents uploaded
                  </div>
                )}
              </div>

              {/* Rejection Reason Input */}
              {selectedVerification.verification_status !== "approved" && (
                <div className="lg:col-span-2 space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Rejection Reason <span className="text-red-600">(required if rejecting)</span>
                  </label>

                  <textarea
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (rejectionError) setRejectionError("");
                    }}
                    placeholder="Explain why this submission was rejected (e.g., unclear document, missing information, etc.)..."
                    rows={5}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 resize-none transition-all ${
                      rejectionError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />

                  {rejectionError && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                      <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-semibold text-red-900 text-sm">Rejection Reason Required</p>
                        <p className="text-red-700 text-sm mt-1">{rejectionError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-8 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedVerification(null);
                  setRejectionReason("");
                  setRejectionError("");
                }}
                disabled={isApproving || isRejecting}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              {selectedVerification.verification_status !== "approved" && (
                <>
                  {/* ✅ FIX: removed "!rejectionReason.trim()" so click triggers error message */}
                  <button
                    onClick={handleReject}
                    disabled={isApproving || isRejecting}
                    className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    {isRejecting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    {isApproving ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Approving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

      {/* Document Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{previewName || "Document Preview"}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDocument?.document_type === "commercial_registration" && "Commercial Registration"}
                  {selectedDocument?.document_type === "trade_license" && "Trade License"}
                  {selectedDocument?.document_type === "other" && "Other Document"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedDocument && (
                  <button
                    onClick={() => downloadDocument(selectedDocument)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                )}
                <button onClick={closePreview} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 overflow-hidden">
              {previewLoading ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <svg className="w-12 h-12 animate-spin text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-600">Loading document...</p>
                </div>
              ) : !previewUrl ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No preview available</p>
                </div>
              ) : previewIsPdf ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                  style={{ minHeight: "100%", display: "block" }}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-8 bg-white">
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-200"
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

/* Components */
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-semibold text-gray-700">{title}</div>
    </div>
  );
}

function Avatar({
  url,
  alt,
  initials,
  onError,
  size = 48,
}: {
  url: string | null;
  alt: string;
  initials: string;
  onError: () => void;
  size?: number;
}) {
  if (!url) {
    return (
      <div
        className="flex items-center justify-center text-white font-bold rounded-xl"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
          fontSize: size / 2.8,
        }}
        title={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="rounded-xl object-cover border-2 border-gray-200"
      style={{ width: size, height: size }}
      onError={onError}
    />
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const config = {
    pending: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending" },
    approved: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Approved" },
    rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
    resubmitted: { bg: "bg-blue-100", text: "text-blue-800", label: "Resubmitted" },
  }[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
