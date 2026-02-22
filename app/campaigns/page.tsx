'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Filter,
  Percent,
  DollarSign,
  Calendar,
  Package,
  FolderTree,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  Lock,
  X,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import campaignService, { Campaign, CampaignFormData } from '@/services/campaignService';

const EMPTY_FORM: CampaignFormData = {
  name: '',
  description: '',
  type: 'percentage',
  discount_value: 0,
  maximum_discount: undefined,
  applicable_products: [],
  applicable_categories: [],
  start_date: new Date().toISOString().slice(0, 16),
  end_date: '',
  is_active: true,
  is_automatic: true,
  is_public: true,
};

export default function CampaignsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterAutomatic, setFilterAutomatic] = useState<boolean | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Product/Category input helpers
  const [productInput, setProductInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filterAutomatic !== null) params.is_automatic = filterAutomatic;
      if (filterActive !== null) params.is_active = filterActive;
      const data = await campaignService.getCampaigns(params);
      setCampaigns(data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [filterAutomatic, filterActive]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const openCreate = () => {
    setEditingCampaign(null);
    setFormData(EMPTY_FORM);
    setProductInput('');
    setCategoryInput('');
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      type: campaign.type,
      discount_value: campaign.discount_value,
      maximum_discount: campaign.maximum_discount,
      applicable_products: campaign.applicable_products || [],
      applicable_categories: campaign.applicable_categories || [],
      start_date: campaign.start_date ? campaign.start_date.slice(0, 16) : '',
      end_date: campaign.end_date ? campaign.end_date.slice(0, 16) : '',
      is_active: campaign.is_active,
      is_automatic: campaign.is_automatic,
      is_public: campaign.is_public,
    });
    setProductInput('');
    setCategoryInput('');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setFormError('Campaign name is required'); return; }
    if (!formData.discount_value || formData.discount_value <= 0) { setFormError('Discount value must be greater than 0'); return; }
    if (formData.type === 'percentage' && formData.discount_value > 100) { setFormError('Percentage discount cannot exceed 100%'); return; }

    setIsSaving(true);
    setFormError(null);
    try {
      const payload = { ...formData };
      if (!payload.end_date) delete (payload as any).end_date;
      if (!payload.maximum_discount) delete payload.maximum_discount;

      if (editingCampaign) {
        await campaignService.updateCampaign(editingCampaign.id, payload);
      } else {
        await campaignService.createCampaign(payload);
      }
      setShowModal(false);
      fetchCampaigns();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (campaign: Campaign) => {
    try {
      await campaignService.toggleCampaign(campaign.id, !campaign.is_active);
      fetchCampaigns();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle campaign');
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) return;
    try {
      await campaignService.deleteCampaign(campaign.id);
      fetchCampaigns();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const addProductId = () => {
    const id = parseInt(productInput.trim());
    if (!isNaN(id) && !formData.applicable_products?.includes(id)) {
      setFormData(f => ({ ...f, applicable_products: [...(f.applicable_products || []), id] }));
    }
    setProductInput('');
  };

  const addCategoryId = () => {
    const id = parseInt(categoryInput.trim());
    if (!isNaN(id) && !formData.applicable_categories?.includes(id)) {
      setFormData(f => ({ ...f, applicable_categories: [...(f.applicable_categories || []), id] }));
    }
    setCategoryInput('');
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.is_active).length,
    automatic: campaigns.filter(c => c.is_automatic).length,
    expiringSoon: campaigns.filter(c => {
      if (!c.end_date) return false;
      const diff = new Date(c.end_date).getTime() - Date.now();
      return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
    }).length,
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'No end date';
    return new Date(date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isCampaignLive = (c: Campaign) => {
    if (!c.is_active) return false;
    const now = Date.now();
    const start = new Date(c.start_date).getTime();
    const end = c.end_date ? new Date(c.end_date).getTime() : Infinity;
    return start <= now && now <= end;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-7 h-7 text-indigo-600" />
                  Sale Campaigns
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage automatic discounts and promotional campaigns
                </p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Campaigns', value: stats.total, icon: Tag, color: 'bg-indigo-50 text-indigo-600' },
                { label: 'Active', value: stats.active, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                { label: 'Automatic', value: stats.automatic, icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
                { label: 'Expiring Soon', value: stats.expiringSoon, icon: Calendar, color: 'bg-red-50 text-red-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterAutomatic === null ? '' : String(filterAutomatic)}
                  onChange={e => setFilterAutomatic(e.target.value === '' ? null : e.target.value === 'true')}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="true">Automatic</option>
                  <option value="false">Coupon</option>
                </select>
                <select
                  value={filterActive === null ? '' : String(filterActive)}
                  onChange={e => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-16">
                  <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No campaigns found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create your first campaign to get started</p>
                  <button onClick={openCreate} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaign</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Discount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredCampaigns.map(campaign => (
                        <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{campaign.name}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                    {campaign.code}
                                  </span>
                                  {campaign.is_automatic && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Zap className="w-3 h-3" /> Auto
                                    </span>
                                  )}
                                  {campaign.is_public ? (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Globe className="w-3 h-3" /> Public
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Lock className="w-3 h-3" /> Private
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${campaign.type === 'percentage' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                {campaign.type === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {campaign.type === 'percentage'
                                  ? `${campaign.discount_value}%`
                                  : `৳${campaign.discount_value.toLocaleString()}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            <div className="flex flex-col gap-0.5">
                              {campaign.applicable_products?.length ? (
                                <span className="flex items-center gap-1 text-xs">
                                  <Package className="w-3 h-3" /> {campaign.applicable_products.length} product{campaign.applicable_products.length !== 1 ? 's' : ''}
                                </span>
                              ) : null}
                              {campaign.applicable_categories?.length ? (
                                <span className="flex items-center gap-1 text-xs">
                                  <FolderTree className="w-3 h-3" /> {campaign.applicable_categories.length} categor{campaign.applicable_categories.length !== 1 ? 'ies' : 'y'}
                                </span>
                              ) : null}
                              {!campaign.applicable_products?.length && !campaign.applicable_categories?.length && (
                                <span className="text-xs text-gray-400">All products</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="text-gray-400">From:</span> {formatDate(campaign.start_date)}
                            </div>
                            <div className="mt-0.5">
                              <span className="text-gray-400">To:</span> {formatDate(campaign.end_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {isCampaignLive(campaign) ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  Live
                                </span>
                              ) : campaign.is_active ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full w-fit">
                                  <CheckCircle className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                  <XCircle className="w-3 h-3" /> Inactive
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleToggle(campaign)}
                                title={campaign.is_active ? 'Deactivate' : 'Activate'}
                                className={`p-1.5 rounded-lg transition-colors ${campaign.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              >
                                {campaign.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => openEdit(campaign)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(campaign)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Winter Sale 2026"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this campaign..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(f => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount Value * {formData.type === 'percentage' ? '(%)' : '(৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formData.type === 'percentage' ? 100 : undefined}
                    value={formData.discount_value || ''}
                    onChange={e => setFormData(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                    placeholder={formData.type === 'percentage' ? '20' : '500'}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Max discount (for percentage) */}
              {formData.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Discount Cap (৳) <span className="text-gray-400 font-normal">optional</span></label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maximum_discount || ''}
                    onChange={e => setFormData(f => ({ ...f, maximum_discount: parseFloat(e.target.value) || undefined }))}
                    placeholder="Leave empty for no cap"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="datetime-local"
                    value={formData.end_date || ''}
                    onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for indefinite campaign</p>
                </div>
              </div>

              {/* Applicable Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Applicable Product IDs <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={productInput}
                    onChange={e => setProductInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addProductId()}
                    placeholder="Enter product ID and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button onClick={addProductId} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add</button>
                </div>
                {formData.applicable_products && formData.applicable_products.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.applicable_products.map(id => (
                      <span key={id} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                        Product #{id}
                        <button onClick={() => setFormData(f => ({ ...f, applicable_products: f.applicable_products?.filter(p => p !== id) }))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Applicable Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <FolderTree className="w-3.5 h-3.5" /> Applicable Category IDs <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategoryId()}
                    placeholder="Enter category ID and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button onClick={addCategoryId} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add</button>
                </div>
                {formData.applicable_categories && formData.applicable_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.applicable_categories.map(id => (
                      <span key={id} className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                        Category #{id}
                        <button onClick={() => setFormData(f => ({ ...f, applicable_categories: f.applicable_categories?.filter(c => c !== id) }))} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'is_automatic', label: 'Automatic Discount', desc: 'Applies without a code', icon: Zap, color: 'yellow' },
                  { key: 'is_public', label: 'Public Campaign', desc: 'Visible in public API', icon: Globe, color: 'blue' },
                  { key: 'is_active', label: 'Active', desc: 'Enable this campaign', icon: CheckCircle, color: 'green' },
                ].map(toggle => {
                  const isOn = formData[toggle.key as keyof CampaignFormData] as boolean;
                  return (
                    <button
                      key={toggle.key}
                      onClick={() => setFormData(f => ({ ...f, [toggle.key]: !isOn }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${isOn ? `border-${toggle.color}-400 bg-${toggle.color}-50` : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <toggle.icon className={`w-4 h-4 ${isOn ? `text-${toggle.color}-600` : 'text-gray-400'}`} />
                        <div className={`w-8 h-4 rounded-full transition-colors relative ${isOn ? `bg-${toggle.color}-500` : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isOn ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{toggle.label}</p>
                      <p className="text-xs text-gray-500">{toggle.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
