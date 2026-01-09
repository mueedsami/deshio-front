import axiosInstance from '@/lib/axios';

export type PublicCustomerRegistrationPayload = {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  customer_type?: 'counter' | 'social_commerce' | 'ecommerce' | string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other' | string;
  preferences?: Record<string, any>;
  social_profiles?: Record<string, any>;
  tags?: string[];
  notes?: string;
};

export type CustomerRecord = Record<string, any>;

/**
 * Public endpoint per docs:
 * POST /api/customer-registration (no auth required)
 */
const customerRegistrationService = {
  async register(payload: PublicCustomerRegistrationPayload): Promise<CustomerRecord> {
    const res = await axiosInstance.post('/customer-registration', payload);
    // Some backends return {success:true,data:{...}}, others return the object directly.
    const body: any = res.data;
    if (body?.success === false) {
      const msg = body?.message || 'Registration failed';
      const err: any = new Error(msg);
      err.errors = body?.errors;
      throw err;
    }
    return body?.data ?? body;
  },
};

export default customerRegistrationService;
