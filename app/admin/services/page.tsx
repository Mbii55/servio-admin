// app/admin/services/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/context/AuthContext";

type Service = {
  id: string;
  title: string;
  description: string;
  base_price: string;
  duration_minutes: number | null;
  images: string[] | null;
  is_active: boolean;
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
  provider: NonNullable<Service['provider']>;
};

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

  const loadServices = async () => {
    setLoadingServices(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      
      if (filters.categoryId) {
        params.append("categoryId", filters.categoryId);
      }
      if (filters.providerId) {
        params.append("providerId", filters.providerId);
      }
      
      params.append("limit", pagination.limit.toString());
      params.append("offset", pagination.offset.toString());

      const response = await api.get(`/services?${params.toString()}`);
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
    if (isAdmin) {
      loadServices();
    }
  }, [isAdmin, pagination.limit, pagination.offset, filters, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadServiceDetails = async (serviceId: string) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/services/${serviceId}`);
      setSelectedService(response.data);
      setCurrentImageIndex(0);
      setShowModal(true);
    } catch (err: any) {
      console.error("Failed to load service details:", err);
      alert("Failed to load service details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (filters.status === "all") return services;
    return services.filter(service => 
      filters.status === "active" ? service.is_active : !service.is_active
    );
  }, [services, filters.status]);

  const totalPages = Math.ceil(totalCount / pagination.limit);
  const hasPrevious = pagination.currentPage > 1;
  const hasNext = pagination.currentPage < totalPages;

  const handlePageChange = (page: number) => {
    const offset = (page - 1) * pagination.limit;
    setPagination({
      ...pagination,
      offset,
      currentPage: page,
    });
  };

  const handleStatusToggle = async (serviceId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this service?`)) {
      return;
    }

    try {
      await api.patch(`/services/${serviceId}`, {
        is_active: !currentStatus,
      });
      
      await loadServices();
      
      if (selectedService?.id === serviceId) {
        await loadServiceDetails(serviceId);
      }
    } catch (err: any) {
      console.error("Failed to update service status:", err);
      alert("Failed to update service status. Please try again.");
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`/services/${serviceId}`);
      
      await loadServices();
      
      if (selectedService?.id === serviceId) {
        setShowModal(false);
        setSelectedService(null);
      }
    } catch (err: any) {
      console.error("Failed to delete service:", err);
      alert("Failed to delete service. Please try again.");
    }
  };

  const nextImage = () => {
    if (selectedService?.images && selectedService.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === selectedService.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedService?.images && selectedService.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedService.images!.length - 1 : prev - 1
      );
    }
  };

  if (!isAdmin) return null;

  const stats = {
    total: totalCount,
    active: services.filter(s => s.is_active).length,
    inactive: services.filter(s => !s.is_active).length,
  };

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Services"
          value={stats.total.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M17 13.255A19.931 19.931 0 0110 15c-2.183 0-4.22-.42-6-1.145M13 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 16h10a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        />
        <StatCard
          title="Active Services"
          value={stats.active.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16z"
                fill="white"
                opacity="0.3"
              />
              <path
                d="M7 10l2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
        />
        <StatCard
          title="Inactive Services"
          value={stats.inactive.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
              <path d="M6 6l8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
      </div>

      {/* Filters and Search */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          {/* Search */}
          <div style={styles.searchContainer}>
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
              placeholder="Search services, providers, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={styles.clearButton}
              >
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <circle cx="8" cy="8" r="6" stroke="#6B7280" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" fill="#6B7280" />
              </svg>
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
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadServices}
            disabled={loadingServices}
            style={{
              ...styles.refreshButton,
              opacity: loadingServices ? 0.5 : 1,
              cursor: loadingServices ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: loadingServices ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
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
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#FEE2E2" />
            <path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Services Grid */}
      <div style={styles.gridContainer}>
        {loadingServices ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M51 39.255A39.931 39.931 0 0032 43c-6.366 0-12.44-1.24-18-3.49M38 14V8a4 4 0 00-4-4h-8a4 4 0 00-4 4v6m8 12h.02M10 48h36a4 4 0 004-4V20a4 4 0 00-4-4H10a4 4 0 00-4 4v24a4 4 0 004 4z"
                  stroke="#D1D5DB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>
              {searchTerm ? "No services found" : "No services yet"}
            </h3>
            <p style={styles.emptyText}>
              {searchTerm
                ? "Try adjusting your search or filters"
                : "Services created by providers will appear here"}
            </p>
          </div>
        ) : (
          <>
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onView={() => loadServiceDetails(service.id)}
                onStatusToggle={() => handleStatusToggle(service.id, service.is_active)}
                onDelete={() => handleDelete(service.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loadingServices && filteredServices.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, totalCount)} of {totalCount} services
          </div>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!hasPrevious}
              style={{
                ...styles.paginationButton,
                opacity: hasPrevious ? 1 : 0.5,
                cursor: hasPrevious ? 'pointer' : 'not-allowed',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Previous
            </button>

            <div style={styles.pageNumbers}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
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
                cursor: hasNext ? 'pointer' : 'not-allowed',
              }}
            >
              Next
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showModal && selectedService && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowModal(false);
          setSelectedService(null);
        }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {loadingDetails ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <p>Loading service details...</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div style={styles.modalHeader}>
                  <div>
                    <h2 style={styles.modalTitle}>{selectedService.title}</h2>
                    <div style={styles.modalBadges}>
                      <StatusBadge status={selectedService.is_active ? "active" : "inactive"} />
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
                  {/* Left Column: Images */}
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
                        {/* Main Image */}
                        <div style={styles.mainImageContainer}>
                          <img
                            src={selectedService.images[currentImageIndex]}
                            alt={`${selectedService.title} - Image ${currentImageIndex + 1}`}
                            style={styles.mainImage}
                          />
                          
                          {/* Navigation Arrows */}
                          {selectedService.images.length > 1 && (
                            <>
                              <button onClick={prevImage} style={{ ...styles.imageNav, left: 16 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                              <button onClick={nextImage} style={{ ...styles.imageNav, right: 16 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </>
                          )}
                          
                          {/* Image Counter */}
                          <div style={styles.imageCounter}>
                            {currentImageIndex + 1} / {selectedService.images.length}
                          </div>
                        </div>

                        {/* Thumbnail Strip */}
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

                  {/* Right Column: Details */}
                  <div>
                    {/* Service Information */}
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={styles.modalSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                            stroke="#6B7280"
                            strokeWidth="1.5"
                          />
                          <path d="M8 8V5M8 11h.01" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Service Information
                      </h3>
                      <div style={styles.modalSection}>
                        <div style={styles.detailsGrid}>
                          <DetailItem
                            label="Price"
                            value={`QAR ${parseFloat(selectedService.base_price).toFixed(2)}`}
                            icon={
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M7 4v6M4 7h6M7 12A5 5 0 107 2a5 5 0 000 10z" stroke="#6B7280" strokeWidth="1.5" />
                              </svg>
                            }
                          />
                          <DetailItem
                            label="Duration"
                            value={selectedService.duration_minutes ? `${selectedService.duration_minutes} min` : "Not set"}
                            icon={
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.5" />
                                <path d="M7 4v3l2 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            }
                          />
                          <DetailItem
                            label="Category"
                            value={selectedService.category_name || "Uncategorized"}
                            icon={
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M5 5h.01M5 5h3c.256 0 .512.098.707.293l3.5 3.5a1 1 0 010 1.414l-3.5 3.5a1 1 0 01-1.414 0l-3.5-3.5A.997.997 0 013 10V7a2 2 0 012-2z" stroke="#6B7280" strokeWidth="1.5" />
                              </svg>
                            }
                          />
                          <DetailItem
                            label="Status"
                            value={selectedService.is_active ? "Active" : "Inactive"}
                            icon={
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.5" />
                              </svg>
                            }
                          />
                        </div>
                        <div style={{ marginTop: 16 }}>
                          <div style={styles.detailLabel}>Description</div>
                          <div style={styles.description}>
                            {selectedService.description}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Provider Information */}
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
                            <DetailItem
                              label="Phone"
                              value={selectedService.provider.phone || "N/A"}
                            />
                            {selectedService.provider.business_profile?.business_name && (
                              <DetailItem
                                label="Business"
                                value={selectedService.provider.business_profile.business_name}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div>
                      <h3 style={styles.modalSectionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M5 2v2M11 2v2M3 7h10M4 4h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#6B7280" strokeWidth="1.5" />
                        </svg>
                        Dates
                      </h3>
                      <div style={styles.modalSection}>
                        <div style={styles.detailsGrid}>
                          <DetailItem
                            label="Created"
                            value={new Date(selectedService.created_at).toLocaleString()}
                          />
                          <DetailItem
                            label="Last Updated"
                            value={new Date(selectedService.updated_at).toLocaleString()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={styles.modalFooter}>
                  <button
                    onClick={() => handleStatusToggle(selectedService.id, selectedService.is_active)}
                    style={{
                      ...styles.modalButton,
                      ...(selectedService.is_active ? styles.modalDeactivateButton : styles.modalActivateButton),
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    {selectedService.is_active ? "Deactivate Service" : "Activate Service"}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedService.id)}
                    style={styles.modalDeleteButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Delete Service
                  </button>
                </div>
              </>
            )}
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

function ServiceCard({
  service,
  onView,
  onStatusToggle,
  onDelete,
}: {
  service: Service;
  onView: () => void;
  onStatusToggle: () => void;
  onDelete: () => void;
}) {
  const firstImage = service.images && service.images.length > 0 ? service.images[0] : null;

  return (
    <div style={styles.serviceCard}>
      {/* Image */}
      <div style={styles.serviceImage} onClick={onView}>
        {firstImage ? (
          <>
            <img
              src={firstImage}
              alt={service.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {service.images && service.images.length > 1 && (
              <div style={styles.imageCount}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 9l3-3 2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {service.images.length}
              </div>
            )}
          </>
        ) : (
          <div style={styles.noServiceImage}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M4 24l6-6 4 4 8-8 6 6V8H4v16zM10 12a2 2 0 100-4 2 2 0 000 4z"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.serviceContent}>
        <div style={styles.serviceHeader}>
          <h3 style={styles.serviceName} onClick={onView}>{service.title}</h3>
          <StatusBadge status={service.is_active ? "active" : "inactive"} />
        </div>

        <p style={styles.serviceDescription}>
          {service.description.length > 80
            ? `${service.description.substring(0, 80)}...`
            : service.description}
        </p>

        <div style={styles.serviceMeta}>
          <div style={styles.servicePrice}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 4v6M4 7h6M7 12A5 5 0 107 2a5 5 0 000 10z" stroke="#059669" strokeWidth="1.5" />
            </svg>
            QAR {parseFloat(service.base_price).toFixed(2)}
          </div>
          {service.duration_minutes && (
            <div style={styles.serviceDuration}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.5" />
                <path d="M7 4v3l2 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {service.duration_minutes} min
            </div>
          )}
        </div>

        {service.category_name && (
          <div style={styles.serviceCategory}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 4h.01M4 4h2c.256 0 .512.098.707.293l2.5 2.5a1 1 0 010 1.414l-2.5 2.5a1 1 0 01-1.414 0l-2.5-2.5A.997.997 0 012 8V6a2 2 0 012-2z" stroke="#6B7280" strokeWidth="1.5" />
            </svg>
            {service.category_name}
          </div>
        )}

        {service.provider && (
          <div style={styles.serviceProvider}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 6a2 2 0 100-4 2 2 0 000 4zM2 10a4 4 0 018 0H2z" fill="#6B7280" />
            </svg>
            {service.provider.first_name} {service.provider.last_name}
            {service.provider.business_profile?.business_name && (
              <> · {service.provider.business_profile.business_name}</>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.serviceActions}>
        <button onClick={onView} style={styles.viewButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          View Details
        </button>
        <button onClick={onStatusToggle} style={service.is_active ? styles.deactivateButton : styles.activateButton}>
          {service.is_active ? "Deactivate" : "Activate"}
        </button>
        <button onClick={onDelete} style={styles.deleteButton}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1m1.5 0v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4h7.5z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const colors = {
    active: { background: "#ECFDF5", color: "#059669" },
    inactive: { background: "#FEE2E2", color: "#DC2626" },
  };

  return (
    <span style={{ ...styles.badge, ...colors[status] }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div style={styles.detailLabel}>
        {icon && <span style={{ marginRight: 6, display: "inline-flex" }}>{icon}</span>}
        {label}
      </div>
      <div style={styles.detailValue}>{value}</div>
    </div>
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
  },
  searchIconWrapper: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
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
    outline: "none",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
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
    cursor: "pointer",
    outline: "none",
    background: "#FFFFFF",
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
  },

  // Error Alert
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: 12,
    color: "#991B1B",
    marginBottom: 24,
    fontSize: 14,
    fontWeight: "600",
  },

  // Grid
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
    marginBottom: 24,
  },

  // Loading State
  loadingState: {
    gridColumn: "1 / -1",
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

  // Empty State
  emptyState: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    background: "#FFFFFF",
    borderRadius: 16,
    border: "2px dashed #E5E7EB",
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
  },

  // Service Card
  serviceCard: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
  },
  serviceImage: {
    width: "100%",
    height: 200,
    position: "relative",
    cursor: "pointer",
    background: "#F3F4F6",
    overflow: "hidden",
  },
  imageCount: {
    position: "absolute",
    bottom: 12,
    right: 12,
    background: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  noServiceImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceContent: {
    padding: 20,
    flex: 1,
  },
  serviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  serviceName: {
    margin: 0,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    cursor: "pointer",
  },
  serviceDescription: {
    margin: "0 0 16px 0",
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.6,
  },
  serviceMeta: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
  },
  servicePrice: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  serviceDuration: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  serviceCategory: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  serviceProvider: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  serviceActions: {
    display: "flex",
    gap: 8,
    padding: 20,
    borderTop: "1px solid #F3F4F6",
  },
  viewButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  deactivateButton: {
    padding: "10px 16px",
    border: "none",
    background: "#FEE2E2",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    cursor: "pointer",
  },
  activateButton: {
    padding: "10px 16px",
    border: "none",
    background: "#ECFDF5",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
    cursor: "pointer",
  },
  deleteButton: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "10px 14px",
    border: "none",
    background: "#FEE2E2",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    cursor: "pointer",
  },

  // Badge
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // Pagination
  pagination: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  paginationInfo: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  paginationButtons: {
    display: "flex",
    gap: 8,
  },
  paginationButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  pageNumbers: {
    display: "flex",
    gap: 4,
  },
  pageNumber: {
    width: 40,
    height: 40,
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    cursor: "pointer",
  },
  pageNumberActive: {
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderColor: "#3B82F6",
    color: "#FFFFFF",
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
    maxWidth: 1000,
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
  modalTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalBadges: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  serviceId: {
    fontSize: 13,
    color: "#9CA3AF",
    fontFamily: "monospace",
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
  },
  modalBody: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    padding: 24,
    overflowY: "auto",
  },
  modalSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 12px 0",
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },
  modalSection: {
    background: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "flex",
    alignItems: "center",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  description: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 1.6,
    background: "white",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #E5E7EB",
  },
  mainImageContainer: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    height: 300,
    background: "#F3F4F6",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imageNav: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255, 255, 255, 0.9)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#374151",
  },
  imageCounter: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: "700",
  },
  thumbnailStrip: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "8px 0",
  },
  thumbnail: {
    flex: "0 0 auto",
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    background: "none",
    cursor: "pointer",
    padding: 0,
  },
  noImage: {
    height: 300,
    background: "#F3F4F6",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    color: "#9CA3AF",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    padding: 24,
    borderTop: "1px solid #F3F4F6",
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
    border: "none",
  },
  modalDeactivateButton: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  modalActivateButton: {
    background: "#ECFDF5",
    color: "#059669",
  },
  modalDeleteButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    border: "none",
    background: "#FEE2E2",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    cursor: "pointer",
  },
};

// Add animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input:focus, select:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .service-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(styleSheet);