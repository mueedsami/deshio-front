'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Package, AlertTriangle } from 'lucide-react';
import sslcommerzService from '@/services/sslcommerzService';

/**
 * Payment Status Checker Component
 * 
 * This component should be used in pages where users land after SSLCommerz redirect
 * For example: My Account page, Order Details page
 * 
 * It checks if there's a pending payment and verifies its status
 */

interface PaymentStatusCheckerProps {
  onPaymentVerified?: (orderId: number, status: 'completed' | 'failed' | 'cancelled') => void;
}

export default function PaymentStatusChecker({ onPaymentVerified }: PaymentStatusCheckerProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [paymentResult, setPaymentResult] = useState<{
    status: 'success' | 'failed' | 'cancelled' | null;
    orderNumber: string | null;
    message: string | null;
  }>({ status: null, orderNumber: null, message: null });

  useEffect(() => {
    const checkPendingPayment = async () => {
      try {
        // Check if there's a payment intent stored
        const paymentIntent = sslcommerzService.getPaymentIntent();

        if (!paymentIntent) {
          // No pending payment
          setChecking(false);
          return;
        }

        console.log('🔍 Found payment intent:', paymentIntent);

        // Check if payment is still recent (within 30 minutes)
        const thirtyMinutes = 30 * 60 * 1000;
        const timeSincePayment = Date.now() - paymentIntent.timestamp;

        if (timeSincePayment > thirtyMinutes) {
          console.log('⏰ Payment intent expired');
          sslcommerzService.clearPaymentIntent();
          setChecking(false);
          return;
        }

        // Verify payment status from backend
        console.log('✅ Checking payment status for order:', paymentIntent.order_id);
        
        const result = await sslcommerzService.checkPaymentStatus(paymentIntent.order_id);

        console.log('📊 Payment status result:', result);

        // Determine payment outcome
        if (result.order.payment_status === 'completed') {
          setPaymentResult({
            status: 'success',
            orderNumber: result.order.order_number,
            message: 'Payment successful! Your order has been confirmed.',
          });
          
          if (onPaymentVerified) {
            onPaymentVerified(result.order.id, 'completed');
          }
        } else if (result.order.status === 'payment_failed') {
          setPaymentResult({
            status: 'failed',
            orderNumber: result.order.order_number,
            message: 'Payment failed. Please try again or choose a different payment method.',
          });
          
          if (onPaymentVerified) {
            onPaymentVerified(result.order.id, 'failed');
          }
        } else if (result.order.status === 'cancelled') {
          setPaymentResult({
            status: 'cancelled',
            orderNumber: result.order.order_number,
            message: 'Payment was cancelled. You can retry payment from your orders.',
          });
          
          if (onPaymentVerified) {
            onPaymentVerified(result.order.id, 'cancelled');
          }
        }

        // Clear payment intent after verification
        sslcommerzService.clearPaymentIntent();
        
        // Hide notification after 10 seconds
        setTimeout(() => {
          setPaymentResult({ status: null, orderNumber: null, message: null });
        }, 10000);

      } catch (error: any) {
        console.error('❌ Payment verification error:', error);
        
        // Show error notification
        setPaymentResult({
          status: 'failed',
          orderNumber: null,
          message: 'Could not verify payment status. Please check your orders.',
        });

        // Clear intent on error
        sslcommerzService.clearPaymentIntent();
      } finally {
        setChecking(false);
      }
    };

    checkPendingPayment();
  }, [onPaymentVerified]);

  // Don't render anything if not checking and no result
  if (!checking && !paymentResult.status) {
    return null;
  }

  // Render checking state
  if (checking) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <div>
            <h4 className="font-semibold text-gray-900">Verifying Payment</h4>
            <p className="text-sm text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render result notification
  if (paymentResult.status) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
        {paymentResult.status === 'success' && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-green-900 mb-1">Payment Successful!</h4>
                <p className="text-sm text-green-800 mb-2">{paymentResult.message}</p>
                {paymentResult.orderNumber && (
                  <p className="text-xs text-green-700 font-mono">
                    Order: {paymentResult.orderNumber}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPaymentResult({ status: null, orderNumber: null, message: null })}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {paymentResult.status === 'failed' && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-red-900 mb-1">Payment Failed</h4>
                <p className="text-sm text-red-800 mb-2">{paymentResult.message}</p>
                {paymentResult.orderNumber && (
                  <button
                    onClick={() => router.push('/e-commerce/my-account')}
                    className="text-xs text-red-700 font-medium hover:underline"
                  >
                    View Orders →
                  </button>
                )}
              </div>
              <button
                onClick={() => setPaymentResult({ status: null, orderNumber: null, message: null })}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {paymentResult.status === 'cancelled' && (
          <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-yellow-900 mb-1">Payment Cancelled</h4>
                <p className="text-sm text-yellow-800 mb-2">{paymentResult.message}</p>
                {paymentResult.orderNumber && (
                  <button
                    onClick={() => router.push('/e-commerce/my-account')}
                    className="text-xs text-yellow-700 font-medium hover:underline"
                  >
                    View Orders →
                  </button>
                )}
              </div>
              <button
                onClick={() => setPaymentResult({ status: null, orderNumber: null, message: null })}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}