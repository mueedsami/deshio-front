'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Package, MapPin, CreditCard, Printer, Download, Home, Loader2 } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import checkoutService, { Order } from '@/services/checkoutService';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setError('Invalid order number');
        setLoading(false);
        return;
      }

      try {
        const orderData = await checkoutService.getOrderByNumber(orderNumber);
        setOrder(orderData);
      } catch (err: any) {
        console.error('Failed to fetch order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF download will be implemented');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-red-700 mx-auto mb-4" />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-red-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={48} />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We've received your order and will process it soon.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-2xl font-bold text-red-700">{order.order_number}</p>
          </div>

          {order.estimated_delivery && (
            <p className="text-gray-600 mt-4">
              Estimated Delivery: <span className="font-semibold">{new Date(order.estimated_delivery).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 print:hidden">
          <button
            onClick={() => router.push(`/e-commerce/order-tracking/${order.order_number}`)}
            className="flex-1 bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
          >
            <Package size={20} />
            Track Order
          </button>
          
          <button
            onClick={handlePrint}
            className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Printer size={20} />
            Print
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Home size={20} />
            Continue Shopping
          </button>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Order Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Order Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="text-red-700" size={20} />
                Order Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`font-medium capitalize ${
                    order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="text-red-700" size={20} />
                Shipping Address
              </h3>
              <div className="text-sm text-gray-700">
                <p className="font-semibold">{order.shipping_address.name}</p>
                <p>{order.shipping_address.phone}</p>
                {order.shipping_address.email && <p>{order.shipping_address.email}</p>}
                <p className="mt-2">
                  {order.shipping_address.address_line_1}
                  {order.shipping_address.address_line_2 && `, ${order.shipping_address.address_line_2}`}
                </p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
                {order.shipping_address.landmark && (
                  <p className="text-gray-600 mt-1">Landmark: {order.shipping_address.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-product.jpg';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                    {item.sku && <p className="text-sm text-gray-600">SKU: {item.sku}</p>}
                    {(item.color || item.size) && (
                      <p className="text-sm text-gray-600">
                        {item.color && `Color: ${item.color}`}
                        {item.color && item.size && ' | '}
                        {item.size && `Size: ${item.size}`}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ৳{item.total.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      ৳{item.price.toLocaleString('en-BD', { minimumFractionDigits: 2 })} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>৳{order.subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span>৳{order.shipping_charge.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax</span>
                  <span>৳{order.tax_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-৳{order.discount_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span className="text-red-700">৳{order.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 print:hidden">
          <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• You will receive a confirmation SMS/Email shortly</li>
            <li>• Track your order status using the order number</li>
            <li>• Our team will contact you if any clarification is needed</li>
            <li>• You can contact customer support for any queries</li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="mt-8 text-center text-gray-600 text-sm print:hidden">
          <p>Need help? Contact our customer support</p>
          <p className="font-semibold text-gray-900 mt-1">+880 1234-567890</p>
          <p>support@yourstore.com</p>
        </div>
      </div>
    </div>
  );
}