'use client';

import React, { useEffect, useState } from 'react';
import MyAccountShell from '@/components/ecommerce/my-account/MyAccountShell';
import customerProfileService, { CustomerProfile } from '@/services/customerProfileService';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

export default function MyAccountDetailsPage() {
  const { changePassword } = useCustomerAuth();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<Partial<CustomerProfile>>({});

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  const load = async () => {
    setErr('');
    try {
      const p = await customerProfileService.getProfile();
      setProfile(p);
      setForm({
        name: p.name,
        phone: p.phone,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        address: p.address,
        city: p.city,
        state: p.state,
        postal_code: p.postal_code,
        country: p.country || 'Bangladesh',
      });
    } catch (e: any) {
      setErr(e.message || 'Failed to load profile');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async () => {
    setErr('');
    setMsg('');
    try {
      const updated = await customerProfileService.updateProfile(form);
      setProfile(updated);
      setMsg('Profile updated successfully.');
    } catch (e: any) {
      setErr(e.message || 'Failed to update profile');
    }
  };

  const savePassword = async () => {
    setErr('');
    setMsg('');
    try {
      await changePassword(currentPassword, newPassword, newPasswordConfirmation);
      setMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    } catch (e: any) {
      setErr(e.message || 'Failed to change password');
    }
  };

  return (
    <MyAccountShell title="Account details" subtitle="Update your profile info and password.">
      {err ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm mb-4">
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="border border-green-200 bg-green-50 text-green-700 rounded-md p-3 text-sm mb-4">
          {msg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="border rounded-lg p-4">
          <div className="font-semibold mb-4">Profile</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="md:col-span-2">
              <label className="text-gray-600">Email (readonly)</label>
              <input className="border rounded-md px-3 py-2 w-full bg-gray-50"
                value={profile?.email || ''} disabled />
            </div>

            <div>
              <label className="text-gray-600">Name</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.name || ''} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} />
            </div>

            <div>
              <label className="text-gray-600">Phone</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.phone || ''} onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} />
            </div>

            <div>
              <label className="text-gray-600">City</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.city || ''} onChange={(e) => setForm(s => ({ ...s, city: e.target.value }))} />
            </div>

            <div>
              <label className="text-gray-600">State</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.state || ''} onChange={(e) => setForm(s => ({ ...s, state: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <label className="text-gray-600">Address</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.address || ''} onChange={(e) => setForm(s => ({ ...s, address: e.target.value }))} />
            </div>

            <div>
              <label className="text-gray-600">Postal code</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.postal_code || ''} onChange={(e) => setForm(s => ({ ...s, postal_code: e.target.value }))} />
            </div>

            <div>
              <label className="text-gray-600">Country</label>
              <input className="border rounded-md px-3 py-2 w-full"
                value={form.country || ''} onChange={(e) => setForm(s => ({ ...s, country: e.target.value }))} />
            </div>
          </div>

          <button
            onClick={saveProfile}
            className="mt-4 bg-red-700 text-white px-4 py-2 rounded-md text-sm hover:bg-red-800"
          >
            Save changes
          </button>
        </div>

        {/* Password */}
        <div className="border rounded-lg p-4">
          <div className="font-semibold mb-4">Change password</div>

          <div className="space-y-3 text-sm">
            <input
              type="password"
              className="border rounded-md px-3 py-2 w-full"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              className="border rounded-md px-3 py-2 w-full"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="border rounded-md px-3 py-2 w-full"
              placeholder="Confirm new password"
              value={newPasswordConfirmation}
              onChange={(e) => setNewPasswordConfirmation(e.target.value)}
            />

            <button
              onClick={savePassword}
              className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-900"
            >
              Update password
            </button>
          </div>
        </div>
      </div>
    </MyAccountShell>
  );
}
