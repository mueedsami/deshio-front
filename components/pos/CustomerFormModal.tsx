'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Save, UserPlus, AlertCircle } from 'lucide-react';
import customerRegistrationService, { PublicCustomerRegistrationPayload } from '@/services/customerRegistrationService';
import customerService from '@/services/customerService';

type Props = {
  mode: 'create' | 'edit';
  customer?: any | null;
  initial?: Partial<PublicCustomerRegistrationPayload>;
  onClose: () => void;
  onSaved: (customer: any) => void;
};

const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));

export default function CustomerFormModal({ mode, customer, initial, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit' && !!customer?.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const defaultCustomerType = useMemo(() => {
    if (initial?.customer_type) return initial.customer_type;
    // POS creates counter customers by default
    return 'counter';
  }, [initial?.customer_type]);

  // Base fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customerType, setCustomerType] = useState<string>(defaultCustomerType);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');

  // Advanced JSON fields (kept as text for flexibility)
  const [preferencesJson, setPreferencesJson] = useState('');
  const [socialProfilesJson, setSocialProfilesJson] = useState('');

  useEffect(() => {
    const src = isEdit ? customer : initial;
    if (!src) return;

    setName(safeStr(src.name || initial?.name));
    setPhone(safeStr(src.phone || initial?.phone));
    setEmail(safeStr(src.email || initial?.email));
    setCustomerType(safeStr(src.customer_type || initial?.customer_type || defaultCustomerType));
    setAddress(safeStr(src.address || initial?.address));
    setCity(safeStr(src.city || initial?.city));
    setState(safeStr(src.state || initial?.state));
    setPostalCode(safeStr(src.postal_code || initial?.postal_code));
    setCountry(safeStr(src.country || initial?.country || 'Bangladesh'));
    setDateOfBirth(safeStr(src.date_of_birth || initial?.date_of_birth));
    setGender(safeStr(src.gender || initial?.gender));
    setNotes(safeStr(src.notes || initial?.notes));

    const tags = (src.tags || initial?.tags || []) as any;
    if (Array.isArray(tags) && tags.length > 0) setTagsText(tags.join(', '));

    if (src.preferences) {
      try { setPreferencesJson(JSON.stringify(src.preferences, null, 2)); } catch { /* ignore */ }
    }
    if (src.social_profiles) {
      try { setSocialProfilesJson(JSON.stringify(src.social_profiles, null, 2)); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, customer?.id]);

  const parseMaybeJson = (raw: string): any | undefined => {
    const t = raw.trim();
    if (!t) return undefined;
    try {
      return JSON.parse(t);
    } catch {
      throw new Error('Invalid JSON in advanced fields');
    }
  };

  const handleSave = async () => {
    setError(null);
    setFieldErrors({});

    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!cleanPhone) {
      setError('Phone is required');
      return;
    }

    const payload: PublicCustomerRegistrationPayload = {
      name: name.trim(),
      phone: cleanPhone,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(password.trim() ? { password: password.trim() } : {}),
      ...(customerType ? { customer_type: customerType } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(state.trim() ? { state: state.trim() } : {}),
      ...(postalCode.trim() ? { postal_code: postalCode.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(dateOfBirth.trim() ? { date_of_birth: dateOfBirth.trim() } : {}),
      ...(gender ? { gender } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    // tags
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length) payload.tags = tags;

    // advanced json
    try {
      const prefs = parseMaybeJson(preferencesJson);
      if (prefs) payload.preferences = prefs;
      const socials = parseMaybeJson(socialProfilesJson);
      if (socials) payload.social_profiles = socials;
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      let saved: any;

      if (isEdit) {
        // Employee-side update (protected)
        // Keep phone editable only if user changed it intentionally.
        const updatePayload: any = { ...payload };
        delete updatePayload.password; // never update password here
        // Some backends disallow changing phone; keep it but it's ok.
        saved = await customerService.update(Number(customer.id), updatePayload);
      } else {
        // Public registration endpoint
        saved = await customerRegistrationService.register(payload);
      }

      onSaved(saved);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      setError(msg);
      const errs = e?.response?.data?.errors || e?.errors;
      if (errs && typeof errs === 'object') setFieldErrors(errs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
              {isEdit ? (
                <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Customer' : 'Register Customer'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isEdit ? 'Update customer information' : 'Create a new customer profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Customer full name"
              />
              {fieldErrors?.name?.length ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.name.join(', ')}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
                placeholder="01XXXXXXXXX"
              />
              {fieldErrors?.phone?.length ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.phone.join(', ')}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="email@example.com"
              />
              {fieldErrors?.email?.length ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.email.join(', ')}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="counter">Counter (POS)</option>
                <option value="social_commerce">Social Commerce</option>
                <option value="ecommerce">E-commerce</option>
              </select>
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Min 6 characters"
                />
                {fieldErrors?.password?.length ? (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.password.join(', ')}</p>
                ) : null}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="House, Road, Area"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Division</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="vip, premium, newsletter-subscriber"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-sm text-blue-700 dark:text-blue-400 hover:underline"
            >
              {showAdvanced ? 'Hide advanced fields' : 'Show advanced fields'}
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferences (JSON)</label>
                <textarea
                  value={preferencesJson}
                  onChange={(e) => setPreferencesJson(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs"
                  rows={8}
                  placeholder='{\n  "newsletter": true\n}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Social Profiles (JSON)</label>
                <textarea
                  value={socialProfilesJson}
                  onChange={(e) => setSocialProfilesJson(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs"
                  rows={8}
                  placeholder='{\n  "facebook": "facebook.com/username"\n}'
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
