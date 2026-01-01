// app/admin/services/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/context/AuthContext";

type ServiceStatus = "active" | "inactive" | "archived";

type Service = {
  id: string;
  title: string;
  description: string;
  base_price: string;
  duration_minutes: number | null;
  images: string[] | null;
  is_active: boolean;

  // ✅ backend may return either (or both)
  is_archived?: boolean;
  archived_at?: string | null;
  archive_reason?: string | null;

  created_at: string;
  updated_at: string;

  category_name?: string;
  category_slug?: string;

  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    profile_image?: string | null;
    business_profile?: {
      business_name?: string;
      business_logo?: string;
      business_email?: string;
      business_phone?: string;
      street_address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
      latitude?: string;
      longitude?: string;
      business_description?: string;
    } | null;
  };
};

type ServiceDetails = Service & {
  provider: NonNullable<Service["provider"]>;
};

function isArchived(s: Service) {
  return Boolean(s.is_archived) || Boolean(s.archived_at);
}

function getServiceStatus(s: Service): ServiceStatus {
  if (isArchived(s)) return "archived";
  return s.is_active ? "active" : "inactive";
}

export default function ServicesPage() {
  const { isAdmin } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    categoryId: "",
    providerId: "",
    status: "all",
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    currentPage: 1,
  });

  const [selectedService, setSelectedService] = useState<ServiceDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // ✅ NEW: reason modal state
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);

  // ✅ NEW: restore state
  const [isRestoring, setIsRestoring] = useState(false);

  // ✅ NEW: restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const loadServices = async () => {
    setLoadingServices(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.providerId) params.append("providerId", filters.providerId);

      params.append("limit", pagination.limit.toString());
      params.append("offset", pagination.offset.toString());

      // ✅ server-side status filter
      params.append("status", filters.status);

      const response = await api.get(`/services/admin?${params.toString()}`);
      const data = response.data;

      setServices(data.services || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load services:", err);
      setError(err?.response?.data?.error || "Failed to load services");
      setServices([]);
      setTotalCount(0);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, pagination.limit, pagination.offset, filters, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0, currentPage: 1 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadServiceDetails = async (serviceId: string) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/services/admin/${serviceId}`);
      setSelectedService(response.data);
      setCurrentImageIndex(0);
      setShowModal(true);
    } catch (err: any) {
      console.error("Failed to load service details:", err);
      alert(err?.response?.data?.error || "Failed to load service details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // ✅ safe fallback filtering (backend already filters)
  const filteredServices = useMemo(() => {
    if (filters.status === "all") return services;

    if (filters.status === "archived") {
      return services.filter((s) => isArchived(s));
    }

    if (filters.status === "active") {
      return services.filter((s) => !isArchived(s) && s.is_active);
    }

    if (filters.status === "inactive") {
      return services.filter((s) => !isArchived(s) && !s.is_active);
    }

    return services;
  }, [services, filters.status]);

  const totalPages = Math.ceil(totalCount / pagination.limit);
  const hasPrevious = pagination.currentPage > 1;
  const hasNext = pagination.currentPage < totalPages;

  const handlePageChange = (page: number) => {
    const offset = (page - 1) * pagination.limit;
    setPagination({ ...pagination, offset, currentPage: page });
  };

  const handleStatusToggle = async (serviceId: string, currentStatus: boolean) => {
    const target = services.find((s) => s.id === serviceId);
    if (target && isArchived(target)) {
      alert("This service is archived. Restore it first before changing active/inactive status.");
      return;
    }

    if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this service?`)) return;

    setIsToggling(true);
    try {
      await api.patch(`/services/admin/${serviceId}/status`, { is_active: !currentStatus });

      await loadServices();

      if (selectedService?.id === serviceId) {
        await loadServiceDetails(serviceId);
      }
    } catch (err: any) {
      console.error("Failed to update service status:", err);
      alert(err?.response?.data?.error || "Failed to update service status. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  // ✅ step 1: open reason modal (instead of confirm)
  const openArchiveReasonModal = (serviceId: string) => {
    setArchiveTargetId(serviceId);
    setArchiveReason("");
    setShowReasonModal(true);
  };

  // ✅ step 2: submit archive with reason
  const submitArchive = async () => {
    const serviceId = archiveTargetId;
    const reason = archiveReason.trim();

    if (!serviceId) return;

    if (!reason) {
      alert("Please enter a reason for removing this service.");
      return;
    }

    setIsArchiving(true);
    try {
      await api.delete(`/services/admin/${serviceId}`, {
        data: { reason }, // ✅ axios delete body
      });

      setShowReasonModal(false);
      setArchiveTargetId(null);
      setArchiveReason("");

      await loadServices();

      if (selectedService?.id === serviceId) {
        setShowModal(false);
        setSelectedService(null);
      }
    } catch (err: any) {
      console.error("Failed to archive service:", err);

      const status = err?.response?.status;
      const message = err?.response?.data?.error;

      if (status === 403) {
        alert("You are not authorized to archive services.");
        return;
      }

      alert(message || "Failed to archive service. Please try again.");
    } finally {
      setIsArchiving(false);
    }
  };

  // ✅ restore archived service
  const handleRestore = async (serviceId: string) => {
    setIsRestoring(true);
    try {
      await api.patch(`/services/admin/${serviceId}/restore`);

      await loadServices();

      if (selectedService?.id === serviceId) {
        await loadServiceDetails(serviceId);
      }
    } catch (err: any) {
      console.error("Failed to restore service:", err);
      alert(err?.response?.data?.error || "Failed to restore service. Please try again.");
    } finally {
      setIsRestoring(false);
      setShowRestoreModal(false);
    }
  };

  // ✅ open restore modal
  const openRestoreModal = () => {
    setShowRestoreModal(true);
  };

  const nextImage = () => {
    if (selectedService?.images && selectedService.images.length > 0) {
      setCurrentImageIndex((prev) => (prev === selectedService.images!.length - 1 ? 0 : prev + 1));
    }
  };

  const prevImage = () => {
    if (selectedService?.images && selectedService.images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? selectedService.images!.length - 1 : prev - 1));
    }
  };

  if (!isAdmin) return null;

  // ✅ note: these stats are for CURRENT LOADED PAGE (not global DB)
  const stats = {
    total: totalCount,
    active: services.filter((s) => !isArchived(s) && s.is_active).length,
    inactive: services.filter((s) => !isArchived(s) && !s.is_active).length,
    archived: services.filter((s) => isArchived(s)).length,
  };

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Services"
          value={stats.total.toLocaleString()}
          icon={<TotalIcon />}
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        />
        <StatCard
          title="Active Services"
          value={stats.active.toLocaleString()}
          icon={<ActiveIcon />}
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
        />
        <StatCard
          title="Inactive Services"
          value={stats.inactive.toLocaleString()}
          icon={<InactiveIcon />}
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
        <StatCard
          title="Archived"
          value={stats.archived.toLocaleString()}
          icon={<ArchivedIcon />}
          gradient="linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)"
        />
      </div>

      {/* Filters and Search */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          <div style={styles.searchContainer}>
            <div style={styles.searchIconWrapper}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search services, providers, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPagination((prev) => ({ ...prev, offset: 0, currentPage: 1 }));
                }}
                style={styles.clearButton}
              >
                <ClearIcon />
              </button>
            )}
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <StatusIcon />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button
            onClick={loadServices}
            disabled={loadingServices}
            style={{
              ...styles.refreshButton,
              opacity: loadingServices ? 0.5 : 1,
              cursor: loadingServices ? "not-allowed" : "pointer",
            }}
          >
            <RefreshIcon spinning={loadingServices} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          <ErrorIcon />
          <span>{error}</span>
        </div>
      )}

      {/* Services Table */}
      <div style={styles.tableContainer}>
        {loadingServices ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <EmptyIcon />
            </div>
            <h3 style={styles.emptyTitle}>{searchTerm ? "No services found" : "No services yet"}</h3>
            <p style={styles.emptyText}>
              {searchTerm ? "Try adjusting your search or filters" : "Services created by providers will appear here"}
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Image</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Provider</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => {
                const firstImage = service.images && service.images.length > 0 ? service.images[0] : null;
                const providerName = service.provider
                  ? `${service.provider.first_name} ${service.provider.last_name}`
                  : "Unknown";

                return (
                  <tr
                    key={service.id}
                    style={styles.tr}
                    className="table-row"
                    onClick={() => loadServiceDetails(service.id)}
                  >
                    <td style={styles.tdImage}>
                      {firstImage ? (
                        <img src={firstImage} alt={service.title} style={styles.rowImage} />
                      ) : (
                        <div style={styles.noImageCell}>
                          <NoImageIcon />
                        </div>
                      )}
                    </td>
                    <td style={styles.tdTitle}>
                      <div style={{ fontWeight: 600 }}>{service.title}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                        ID: {service.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td style={styles.td}>{providerName}</td>
                    <td style={styles.td}>{service.category_name || "—"}</td>
                    <td style={styles.td}>QAR {Number(service.base_price).toFixed(2)}</td>
                    <td style={styles.td}>{service.duration_minutes ? `${service.duration_minutes} min` : "—"}</td>
                    <td style={styles.td}>
                      <StatusBadge status={getServiceStatus(service)} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => loadServiceDetails(service.id)} style={styles.viewButton}>
                        <ViewIcon />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loadingServices && filteredServices.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, totalCount)} of{" "}
            {totalCount} services
          </div>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!hasPrevious}
              style={{
                ...styles.paginationButton,
                opacity: hasPrevious ? 1 : 0.5,
                cursor: hasPrevious ? "pointer" : "not-allowed",
              }}
            >
              <PrevIcon />
              Previous
            </button>

            <div style={styles.pageNumbers}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (pagination.currentPage <= 3) pageNum = i + 1;
                else if (pagination.currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = pagination.currentPage - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      ...styles.pageNumber,
                      ...(pagination.currentPage === pageNum ? styles.pageNumberActive : {}),
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!hasNext}
              style={{
                ...styles.paginationButton,
                opacity: hasNext ? 1 : 0.5,
                cursor: hasNext ? "pointer" : "not-allowed",
              }}
            >
              Next
              <NextIcon />
            </button>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showModal && selectedService && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowModal(false);
            setSelectedService(null);
          }}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {loadingDetails ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <p>Loading service details...</p>
              </div>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <div>
                    <h2 style={styles.modalTitle}>{selectedService.title}</h2>
                    <div style={styles.modalBadges}>
                      <StatusBadge status={getServiceStatus(selectedService)} />
                      <span style={styles.serviceId}>ID: {selectedService.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedService(null);
                    }}
                    style={styles.closeButton}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div style={styles.modalBody}>
                  <div>
                    <h3 style={styles.modalSectionTitle}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 12l3-3 2 2 4-4 3 3V4H2v8zM5 6a1 1 0 100-2 1 1 0 000 2z"
                          fill="#6B7280"
                        />
                      </svg>
                      Service Images ({selectedService.images?.length || 0})
                    </h3>

                    {selectedService.images && selectedService.images.length > 0 ? (
                      <div>
                        <div style={styles.mainImageContainer}>
                          <img
                            src={selectedService.images[currentImageIndex]}
                            alt={`${selectedService.title} - Image ${currentImageIndex + 1}`}
                            style={styles.mainImage}
                          />
                          {selectedService.images.length > 1 && (
                            <>
                              <button onClick={prevImage} style={{ ...styles.imageNav, left: 16 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M15 18l-6-6 6-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              <button onClick={nextImage} style={{ ...styles.imageNav, right: 16 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M9 18l6-6-6-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                          <div style={styles.imageCounter}>
                            {currentImageIndex + 1} / {selectedService.images.length}
                          </div>
                        </div>

                        {selectedService.images.length > 1 && (
                          <div style={styles.thumbnailStrip}>
                            {selectedService.images.map((img, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                style={{
                                  ...styles.thumbnail,
                                  border: `2px solid ${currentImageIndex === index ? "#3B82F6" : "#E5E7EB"}`,
                                }}
                              >
                                <img
                                  src={img}
                                  alt={`Thumbnail ${index + 1}`}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={styles.noImage}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                          <path
                            d="M6 36l9-9 6 6 12-12 9 9V12H6v24zM15 18a3 3 0 100-6 3 3 0 000 6z"
                            stroke="#D1D5DB"
                            strokeWidth="2"
                          />
                        </svg>
                        <p>No images available</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={styles.modalSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="#6B7280" strokeWidth="1.5" />
                          <path d="M8 8V5M8 11h.01" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Service Information
                      </h3>
                      <div style={styles.modalSection}>
                        <div style={styles.detailsGrid}>
                          <DetailItem label="Price" value={`QAR ${Number(selectedService.base_price).toFixed(2)}`} />
                          <DetailItem
                            label="Duration"
                            value={selectedService.duration_minutes ? `${selectedService.duration_minutes} min` : "Not set"}
                          />
                          <DetailItem label="Category" value={selectedService.category_name || "Uncategorized"} />
                          <DetailItem label="Status" value={getServiceStatus(selectedService).toUpperCase()} />
                        </div>
                        <div style={{ marginTop: 16 }}>
                          <div style={styles.detailLabel}>Description</div>
                          <div style={styles.description}>{selectedService.description}</div>
                        </div>
                      </div>
                    </div>

                    {selectedService.provider && (
                      <div style={{ marginBottom: 24 }}>
                        <h3 style={styles.modalSectionTitle}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0H3z"
                              fill="#6B7280"
                            />
                          </svg>
                          Provider Information
                        </h3>
                        <div style={styles.modalSection}>
                          <div style={styles.detailsGrid}>
                            <DetailItem
                              label="Name"
                              value={`${selectedService.provider.first_name} ${selectedService.provider.last_name}`}
                            />
                            <DetailItem label="Phone" value={selectedService.provider.phone || "N/A"} />
                            {selectedService.provider.business_profile?.business_name && (
                              <DetailItem label="Business" value={selectedService.provider.business_profile.business_name} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 style={styles.modalSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M5 2v2M11 2v2M3 7h10M4 4h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"
                            stroke="#6B7280"
                            strokeWidth="1.5"
                          />
                        </svg>
                        Dates
                      </h3>
                      <div style={styles.modalSection}>
                        <div style={styles.detailsGrid}>
                          <DetailItem label="Created" value={new Date(selectedService.created_at).toLocaleString()} />
                          <DetailItem label="Last Updated" value={new Date(selectedService.updated_at).toLocaleString()} />
                          {isArchived(selectedService) && (
                            <>
                              <DetailItem
                                label="Archived At"
                                value={
                                  selectedService.archived_at
                                    ? new Date(selectedService.archived_at).toLocaleString()
                                    : "N/A"
                                }
                              />
                              <DetailItem
                                label="Archive Reason"
                                value={selectedService.archive_reason || "No reason provided"}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={styles.modalFooter}>
                  {/* ✅ Restore button (only if archived) */}
                  {isArchived(selectedService) && (
                    <button
                      onClick={openRestoreModal}
                      disabled={isRestoring || isToggling || isArchiving}
                      style={{
                        ...styles.modalButton,
                        background: "#059669",
                        color: "white",
                        opacity: isRestoring || isToggling || isArchiving ? 0.7 : 1,
                        cursor: isRestoring || isToggling || isArchiving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isRestoring ? "Restoring..." : "Restore Service"}
                    </button>
                  )}

                  {/* ✅ Toggle and Archive only if not archived */}
                  {!isArchived(selectedService) && (
                    <>
                      <button
                        onClick={() => handleStatusToggle(selectedService.id, selectedService.is_active)}
                        disabled={isToggling || isArchiving || isRestoring}
                        style={{
                          ...styles.modalButton,
                          ...(selectedService.is_active ? styles.modalSuspendButton : styles.modalResumeButton),
                          opacity: isToggling || isArchiving || isRestoring ? 0.7 : 1,
                        }}
                      >
                        {isToggling ? "Please wait..." : selectedService.is_active ? "Deactivate Service" : "Activate Service"}
                      </button>

                      <button
                        onClick={() => openArchiveReasonModal(selectedService.id)}
                        disabled={isToggling || isArchiving || isRestoring}
                        style={{
                          ...styles.modalDeleteButton,
                          opacity: isToggling || isArchiving || isRestoring ? 0.7 : 1,
                        }}
                      >
                        {isArchiving ? "Archiving..." : "Archive Service"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ Reason Modal */}
      {showReasonModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            if (isArchiving) return;
            setShowReasonModal(false);
            setArchiveTargetId(null);
            setArchiveReason("");
          }}
        >
          <div style={styles.reasonModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.reasonHeader}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>Remove Service</h3>
              <button
                onClick={() => {
                  if (isArchiving) return;
                  setShowReasonModal(false);
                  setArchiveTargetId(null);
                  setArchiveReason("");
                }}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ marginTop: 0, marginBottom: 10, color: "#6B7280", fontSize: 13 }}>
                Admin must provide a reason. This will be stored with the archive action.
              </p>

              <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                Reason <span style={{ color: "#DC2626" }}>*</span>
              </label>

              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Example: Duplicate service, policy violation, incorrect category, etc."
                rows={4}
                style={styles.textarea}
                disabled={isArchiving}
              />
            </div>

            <div style={styles.reasonFooter}>
              <button
                onClick={() => {
                  if (isArchiving) return;
                  setShowReasonModal(false);
                  setArchiveTargetId(null);
                  setArchiveReason("");
                }}
                style={styles.cancelBtn}
                disabled={isArchiving}
              >
                Cancel
              </button>

              <button
                onClick={submitArchive}
                style={{
                  ...styles.confirmBtn,
                  opacity: isArchiving ? 0.7 : 1,
                  cursor: isArchiving ? "not-allowed" : "pointer",
                }}
                disabled={isArchiving}
              >
                {isArchiving ? "Archiving..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Restore Confirmation Modal */}
      {showRestoreModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            if (isRestoring) return;
            setShowRestoreModal(false);
          }}
        >
          <div style={styles.reasonModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.reasonHeader}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827" }}>Restore Service</h3>
              <button
                onClick={() => {
                  if (isRestoring) return;
                  setShowRestoreModal(false);
                }}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ margin: 0, color: "#6B7280", fontSize: 13 }}>
                Restore this service? It will be restored as INACTIVE by default.
              </p>
            </div>

            <div style={styles.reasonFooter}>
              <button
                onClick={() => {
                  if (isRestoring) return;
                  setShowRestoreModal(false);
                }}
                style={styles.cancelBtn}
                disabled={isRestoring}
              >
                Cancel
              </button>

              <button
                onClick={() => handleRestore(selectedService!.id)}
                style={{
                  ...styles.restoreConfirmBtn,
                  opacity: isRestoring ? 0.7 : 1,
                  cursor: isRestoring ? "not-allowed" : "pointer",
                }}
                disabled={isRestoring}
              >
                {isRestoring ? "Restoring..." : "Confirm Restore"}
              </button>
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
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: gradient }}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" | "archived" }) {
  const colors = {
    active: { background: "#ECFDF5", color: "#059669" },
    inactive: { background: "#FEF3C7", color: "#D97706" },
    archived: { background: "#FEE2E2", color: "#DC2626" },
  };

  const label = status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Archived";

  return (
    <span style={{ ...styles.badge, ...colors[status] }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
      {label}
    </span>
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

/* ----------------------------- SVG Icons ----------------------------- */
const TotalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="14" rx="2" stroke="white" strokeWidth="2" />
    <path d="M7 8h10M7 12h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ActiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InactiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
    <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ArchivedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 7h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 7v13a2 2 0 002 2h10a2 2 0 002-2V7" stroke="white" strokeWidth="2" />
    <path d="M9 3h6a2 2 0 012 2v2H7V5a2 2 0 012-2z" stroke="white" strokeWidth="2" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
      fill="#9CA3AF"
    />
  </svg>
);

const ClearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M12 4L4 12M4 4l8 8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const StatusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
    <circle cx="8" cy="8" r="6" stroke="#6B7280" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="2" fill="#6B7280" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    style={{ transform: spinning ? "rotate(360deg)" : "rotate(0deg)", transition: "transform 0.6s linear" }}
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
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#FEE2E2" />
    <path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <path
      d="M51 39.255A39.931 39.931 0 0032 43c-6.366 0-12.44-1.24-18-3.49M38 14V8a4 4 0 00-4-4h-8a4 4 0 00-4 4v6m8 12h.02M10 48h36a4 4 0 004-4V20a4 4 0 00-4-4H10a4 4 0 00-4 4v24a4 4 0 004 4z"
      stroke="#D1D5DB"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NoImageIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path
      d="M4 24l6-6 4 4 8-8 6 6V8H4v16zM10 12a2 2 0 100-4 2 2 0 000 4z"
      stroke="#D1D5DB"
      strokeWidth="2"
    />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ----------------------------- Styles ----------------------------- */
const styles: Record<string, React.CSSProperties> = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 },
  statCard: { background: "#FFFFFF", borderRadius: 16, padding: 20, border: "1px solid #F3F4F6", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)", display: "flex", flexDirection: "column", gap: 12 },
  statIcon: { width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" },
  statValue: { fontSize: 28, fontWeight: "800", color: "#111827", letterSpacing: "-0.02em" },
  statTitle: { fontSize: 14, color: "#6B7280", fontWeight: "600" },

  filterPanel: { background: "#FFFFFF", border: "1px solid #F3F4F6", borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)" },
  filterGrid: { display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 16, alignItems: "end" },
  searchContainer: { position: "relative" },
  searchIconWrapper: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  searchInput: { width: "100%", height: 48, paddingLeft: 44, paddingRight: 40, border: "2px solid #E5E7EB", borderRadius: 12, fontSize: 15, fontWeight: "500", outline: "none" },
  clearButton: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" },
  filterItem: { display: "flex", flexDirection: "column", gap: 8 },
  filterLabel: { display: "flex", alignItems: "center", fontSize: 13, fontWeight: "700", color: "#374151" },
  select: { height: 48, padding: "0 14px", border: "2px solid #E5E7EB", borderRadius: 12, fontSize: 14, fontWeight: "600", cursor: "pointer", outline: "none", background: "#FFFFFF" },
  refreshButton: { height: 48, padding: "0 20px", border: "none", background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", borderRadius: 12, fontSize: 14, fontWeight: "700", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" },

  errorAlert: { display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 12, color: "#991B1B", marginBottom: 24, fontSize: 14, fontWeight: "600" },

  tableContainer: { background: "#FFFFFF", borderRadius: 16, border: "1px solid #F3F4F6", overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)", marginBottom: 24 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "16px 20px", background: "#F9FAFB", fontSize: 13, fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB" },
  tr: { cursor: "pointer", transition: "background 0.2s ease" },
  td: { padding: "16px 20px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle", fontSize: 14 },
  tdImage: { padding: "12px 20px", width: 80 },
  tdTitle: { padding: "16px 20px", maxWidth: 300 },
  rowImage: { width: 60, height: 60, objectFit: "cover", borderRadius: 8 },
  noImageCell: { width: 60, height: 60, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  viewButton: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: "700", cursor: "pointer" },

  loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16, color: "#6B7280" },
  spinner: { width: 40, height: 40, border: "4px solid #E5E7EB", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, background: "#FFFFFF", borderRadius: 16, border: "2px dashed #E5E7EB" },
  emptyIconContainer: { marginBottom: 20 },
  emptyTitle: { margin: "0 0 8px 0", fontSize: 20, fontWeight: "800", color: "#111827" },
  emptyText: { margin: 0, fontSize: 14, color: "#6B7280" },

  pagination: { background: "#FFFFFF", border: "1px solid #F3F4F6", borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)" },
  paginationInfo: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  paginationButtons: { display: "flex", gap: 8 },
  paginationButton: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "2px solid #E5E7EB", background: "#FFFFFF", borderRadius: 10, fontSize: 14, fontWeight: "700", color: "#374151" },
  pageNumbers: { display: "flex", gap: 4 },
  pageNumber: { width: 40, height: 40, border: "2px solid #E5E7EB", background: "#FFFFFF", borderRadius: 8, fontSize: 14, fontWeight: "600", color: "#374151", cursor: "pointer" },
  pageNumberActive: { background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", borderColor: "#3B82F6", color: "#FFFFFF" },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal: { background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 1000, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: 24, borderBottom: "1px solid #F3F4F6" },
  modalTitle: { margin: "0 0 8px 0", fontSize: 20, fontWeight: "800", color: "#111827" },
  modalBadges: { display: "flex", gap: 12, alignItems: "center" },
  serviceId: { fontSize: 13, color: "#9CA3AF", fontFamily: "monospace" },
  closeButton: { background: "#F3F4F6", border: "none", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6B7280" },
  modalBody: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 24, overflowY: "auto" },
  modalSectionTitle: { display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px 0", fontSize: 16, fontWeight: "800", color: "#374151" },
  modalSection: { background: "#F9FAFB", borderRadius: 12, padding: 16 },
  detailsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  detailLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  description: { fontSize: 14, color: "#4B5563", lineHeight: 1.6, background: "white", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" },
  mainImageContainer: { position: "relative", marginBottom: 16, borderRadius: 12, overflow: "hidden", height: 300, background: "#F3F4F6" },
  mainImage: { width: "100%", height: "100%", objectFit: "cover" },
  imageNav: { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(255, 255, 255, 0.9)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" },
  imageCounter: { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(0, 0, 0, 0.7)", color: "white", padding: "6px 12px", borderRadius: 20, fontSize: 14, fontWeight: "700" },
  thumbnailStrip: { display: "flex", gap: 8, overflowX: "auto", padding: "8px 0" },
  thumbnail: { flex: "0 0 auto", width: 80, height: 80, borderRadius: 8, overflow: "hidden", background: "none", cursor: "pointer", padding: 0 },
  noImage: { height: 300, background: "#F3F4F6", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9CA3AF" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: 24, borderTop: "1px solid #F3F4F6" },
  modalButton: { display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: "700", cursor: "pointer", border: "none" },
  modalSuspendButton: { background: "#FEF3C7", color: "#D97706" },
  modalResumeButton: { background: "#ECFDF5", color: "#059669" },
  modalDeleteButton: { display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", border: "none", background: "#DC2626", borderRadius: 12, fontSize: 14, fontWeight: "700", color: "white", cursor: "pointer" },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" },

  // ✅ NEW: reason modal styles
  reasonModal: { background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)", overflow: "hidden" },
  reasonHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: "1px solid #F3F4F6" },
  textarea: { width: "100%", minHeight: 100, padding: 12, border: "2px solid #E5E7EB", borderRadius: 8, fontSize: 14, outline: "none", resize: "vertical" },
  reasonFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderTop: "1px solid #F3F4F6" },
  cancelBtn: { padding: "8px 16px", border: "2px solid #E5E7EB", background: "#FFFFFF", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" },
  confirmBtn: { padding: "8px 16px", border: "none", background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#FFFFFF", cursor: "pointer" },
  restoreConfirmBtn: { padding: "8px 16px", border: "none", background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#FFFFFF", cursor: "pointer" },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  input:focus, select:focus, textarea:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
  button:hover:not(:disabled) { transform: translateY(-1px); }
  button:active:not(:disabled) { transform: translateY(0); }
  .table-row:hover { background-color: #F9FAFB !important; }
`;
document.head.appendChild(styleSheet);