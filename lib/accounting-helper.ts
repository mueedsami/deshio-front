// lib/accounting-helper.ts
// Import this helper in your sales, orders, and batch routes to auto-update accounting

/**
 * Triggers accounting data regeneration after any transaction
 * Call this function after creating/updating/deleting:
 * - Batches
 * - Sales
 * - Orders
 * - Returns
 * - Exchanges
 */
export async function updateAccounting() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/accounting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      console.log('✅ Accounting data updated successfully');
      return true;
    } else {
      console.error('❌ Failed to update accounting data');
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating accounting:', error);
    return false;
  }
}


export function triggerAccountingUpdate() {
  // Since we're in server context, we can directly call the processing
  // This is handled automatically by the GET request to /api/accounting
  console.log('✅ Accounting will be regenerated on next fetch');
}


