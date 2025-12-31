'use client';

import React, { useEffect, useMemo, useState } from 'react';
import MyAccountShell from '@/components/ecommerce/my-account/MyAccountShell';
import checkoutService, { Address } from '@/services/checkoutService';

const emptyAddress: Address = {
  name: '',
  phone: '',
  email: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Bangladesh',
  landmark: '',
  delivery_instructions: '',
  type: 'both',
};

export default function MyAccountAddressesPage() {
  const [data, setData] = useState<{
    addresses: Address[];
    default_shipping: Address | null;
    default_billing: Address | null;
    total: number;
  } | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Address>(emptyAddress);

  const editingAddress = useMemo(() => {
    if (!editingId) return null;
    return data?.addresses?.find(a => a.id === editingId) || null;
  }, [editingId, data]);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await checkoutService.getAddresses();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyAddress);
    setFormOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditingId(a.id || null);
    setForm({
      ...emptyAddress,
      ...a,
      country: a.country || 'Bangladesh',
      type: a.type || 'both',
    });
    setFormOpen(true);
  };

  const save = async () => {
    setError('');
    try {
      if (editingId) {
        await checkoutService.updateAddress(editingId, form);
      } else {
        await checkoutService.createAddress(form as any);
      }
      setFormOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to save address');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    setError('');
    try {
      await checkoutService.deleteAddress(id);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete address');
    }
  };

  const setDefault = async (id: number, type: 'shipping' | 'billing') => {
    setError('');
    try {
      if (type === 'shipping') await checkoutService.setDefaultShipping(id);
      else await checkoutService.setDefaultBilling(id);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to set default');
    }
  };

  return (
    <MyAccountShell title="Addresses" subtitle="Manage your shipping and billing addresses.">
      {error ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm mb-4">
          {error}
        </div>
      ) : null}

      <button
        onClick={openCreate}
        className="bg-red-700 text-white px-4 py-2 rounded-md text-sm hover:bg-red-800 mb-6"
      >
        + Add New Address
      </button>

      {loading ? (
        <div className="text-gray-600">Loading addresses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.addresses || []).map((a) => (
            <div key={a.id} className="border rounded-lg p-4 text-sm">
              <div className="font-semibold">{a.name}</div>
              <div className="text-gray-700 mt-1">
                {a.phone}<br />
                {a.address_line_1}{a.address_line_2 ? `, ${a.address_line_2}` : ''}<br />
                {a.city}, {a.state} {a.postal_code}<br />
                {a.country}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button className="border px-3 py-1 rounded-md" onClick={() => openEdit(a)}>
                  Edit
                </button>
                {a.id ? (
                  <button className="border px-3 py-1 rounded-md" onClick={() => remove(a.id!)}>
                    Delete
                  </button>
                ) : null}
                {a.id ? (
                  <>
                    <button className="border px-3 py-1 rounded-md" onClick={() => setDefault(a.id!, 'shipping')}>
                      Set default shipping
                    </button>
                    <button className="border px-3 py-1 rounded-md" onClick={() => setDefault(a.id!, 'billing')}>
                      Set default billing
                    </button>
                  </>
                ) : null}
              </div>

              {(a.is_default_shipping || a.is_default_billing) ? (
                <div className="mt-3 text-xs text-green-700">
                  {a.is_default_shipping ? 'Default Shipping ' : ''}
                  {a.is_default_billing ? 'Default Billing' : ''}
                </div>
              ) : null}
            </div>
          ))}

          {!data?.addresses?.length ? (
            <div className="text-gray-600 text-sm">No addresses found.</div>
          ) : null}
        </div>
      )}

      {/* Simple modal */}
      {formOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </div>
              <button onClick={() => setFormOpen(false)} className="text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <input className="border rounded-md px-3 py-2" placeholder="Name" value={form.name}
                onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} />
              <input className="border rounded-md px-3 py-2" placeholder="Phone" value={form.phone}
                onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 md:col-span-2" placeholder="Address line 1"
                value={form.address_line_1}
                onChange={(e) => setForm(s => ({ ...s, address_line_1: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 md:col-span-2" placeholder="Address line 2 (optional)"
                value={form.address_line_2 || ''}
                onChange={(e) => setForm(s => ({ ...s, address_line_2: e.target.value }))} />
              <input className="border rounded-md px-3 py-2" placeholder="City" value={form.city}
                onChange={(e) => setForm(s => ({ ...s, city: e.target.value }))} />
              <input className="border rounded-md px-3 py-2" placeholder="State" value={form.state}
                onChange={(e) => setForm(s => ({ ...s, state: e.target.value }))} />
              <input className="border rounded-md px-3 py-2" placeholder="Postal code" value={form.postal_code}
                onChange={(e) => setForm(s => ({ ...s, postal_code: e.target.value }))} />
              <input className="border rounded-md px-3 py-2" placeholder="Country" value={form.country}
                onChange={(e) => setForm(s => ({ ...s, country: e.target.value }))} />
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={save} className="bg-red-700 text-white px-4 py-2 rounded-md text-sm hover:bg-red-800">
                Save
              </button>
              <button onClick={() => setFormOpen(false)} className="border px-4 py-2 rounded-md text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MyAccountShell>
  );
}
