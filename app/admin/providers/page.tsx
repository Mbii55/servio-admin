// src/app/admin/providers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../src/context/AuthContext"
import { api } from '../../../src/lib/api';

type VerificationStatus = "pending" | "approved" | "rejected" | "resubmitted";

interface Provider {
  id: string;
  business_name: string;
  is_active: boolean;
  commission_rate: string;
  city: string | null;
  country: string;
  created_at: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_id?: string; // ✅ Added
  verification_status: VerificationStatus; // ✅ Added
  verified_at?: string | null; // ✅ Added
  rejected_at?: string | null; // ✅ Added
}

export default function ProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get("/businessProfiles/admin");
      setProviders(response.data.providers || []);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setError("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProfileModal(true);
  };

  const handleEditCommission = (provider: Provider) => {
    setSelectedProvider(provider);
    setCommissionRate(provider.commission_rate);
    setShowCommissionModal(true);
    setError("");
  };

  const handleUpdateCommission = async () => {
    if (!selectedProvider) return;

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError("Commission rate must be between 0 and 100");
      return;
    }

    try {
      await api.patch(`/businessProfiles/admin/${selectedProvider.id}/commission`, {
        commission_rate: rate,
      });

      setSuccessMessage("Commission rate updated successfully!");
      setShowCommissionModal(false);
      fetchProviders();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update commission rate");
    }
  };

  const handleToggleActive = async (provider: Provider) => {
    try {
      await api.patch(`/businessProfiles/admin/${provider.id}/active`, {
        is_active: !provider.is_active,
      });

      setSuccessMessage(`Provider ${!provider.is_active ? 'activated' : 'deactivated'} successfully!`);
      fetchProviders();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to update provider status");
    }
  };

  // ✅ Navigate to verifications page
  const handleViewVerification = (provider: Provider) => {
    window.location.href = `/admin/verifications?search=${provider.display_id || provider.email}`;
  };

  const filteredProviders = providers.filter((provider) =>
    provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Helper function for verification badge
  const getVerificationBadge = (status: VerificationStatus) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      resubmitted: "bg-blue-100 text-blue-700",
    };

    const labels = {
      pending: "Pending",
      approved: "Verified",
      rejected: "Rejected",
      resubmitted: "Resubmitted",
    };

    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Providers</h1>
          <p className="text-gray-600">Manage provider profiles, verification, and commission rates</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search providers by name, business, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Providers</p>
                <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* ✅ Updated: Verified Providers stat */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {providers.filter(p => p.verification_status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          {/* ✅ New: Pending Verification stat */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {providers.filter(p => p.verification_status === 'pending' || p.verification_status === 'resubmitted').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* ✅ Updated: Active Accounts stat */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Accounts</p>
                <p className="text-2xl font-bold text-blue-600">
                  {providers.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Providers Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Commission
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No providers found
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((provider) => (
                    <tr 
                      key={provider.id} 
                      onClick={() => handleViewProfile(provider)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">
                              {provider.first_name[0]}{provider.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {provider.first_name} {provider.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{provider.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{provider.business_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {provider.city ? `${provider.city}, ` : ''}{provider.country}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getVerificationBadge(provider.verification_status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          provider.is_active
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {provider.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
                            {parseFloat(provider.commission_rate).toFixed(1)}%
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleEditCommission(provider);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Edit commission rate"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Modal - Updated with all actions */}
      {showProfileModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Provider Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Full Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedProvider.first_name} {selectedProvider.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{selectedProvider.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Account Status</p>
                    <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${
                      selectedProvider.is_active
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {selectedProvider.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Member Since</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedProvider.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Status Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verification Status
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Current Status</p>
                      {getVerificationBadge(selectedProvider.verification_status)}
                    </div>
                    {selectedProvider.verification_status !== 'approved' && (
                      <button
                        onClick={() => handleViewVerification(selectedProvider)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Review Documents
                      </button>
                    )}
                  </div>
                  {selectedProvider.verified_at && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Verified On</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedProvider.verified_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedProvider.rejected_at && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Rejected On</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedProvider.rejected_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Business Information
                </h3>
                <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Business Name</p>
                    <p className="font-medium text-gray-900">{selectedProvider.business_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <p className="font-medium text-gray-900">
                      {selectedProvider.city ? `${selectedProvider.city}, ` : ''}{selectedProvider.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Financial Settings
                </h3>
                <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Commission Rate</p>
                      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-purple-600">
                        {parseFloat(selectedProvider.commission_rate).toFixed(1)}%
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        handleEditCommission(selectedProvider);
                      }}
                      className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      Edit Rate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleToggleActive(selectedProvider);
                  setShowProfileModal(false);
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${
                  selectedProvider.is_active
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {selectedProvider.is_active ? "Suspend Account" : "Activate Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Edit Modal - Unchanged */}
      {showCommissionModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Commission Rate</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedProvider.business_name}</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => {
                      setCommissionRate(e.target.value);
                      setError("");
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter commission rate"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                    %
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter a value between 0 and 100. This will only affect new bookings.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important Note</p>
                    <p>Commission rate changes only apply to future bookings. Existing bookings will retain their original rates.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowCommissionModal(false);
                  setError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCommission}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                Update Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}