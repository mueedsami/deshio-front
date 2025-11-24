// lib/qz-tray.ts
let qzConnected = false;

export async function connectQZ(): Promise<boolean> {
  if (qzConnected) return true;

  try {
    if (typeof window === 'undefined' || !window.qz) {
      throw new Error('QZ Tray not available');
    }

    await window.qz.websocket.connect();
    qzConnected = true;
    console.log('✅ QZ Tray connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to QZ Tray:', error);
    throw new Error('QZ Tray is not running. Please start QZ Tray application.');
  }
}

export async function disconnectQZ(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.qz) {
      await window.qz.websocket.disconnect();
      qzConnected = false;
      console.log('✅ QZ Tray disconnected');
    }
  } catch (error) {
    console.error('❌ Failed to disconnect QZ Tray:', error);
  }
}

export async function getPrinters(): Promise<string[]> {
  try {
    await connectQZ();
    
    if (typeof window === 'undefined' || !window.qz) {
      return [];
    }

    // QZ Tray printers.find() method
    const qzPrinters = (window.qz as any).printers;
    if (qzPrinters && qzPrinters.find) {
      const printers = await qzPrinters.find();
      return printers;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Failed to get printers:', error);
    return [];
  }
}

export async function getDefaultPrinter(): Promise<string | null> {
  try {
    await connectQZ();
    
    if (typeof window === 'undefined' || !window.qz) {
      return null;
    }

    const qzPrinters = (window.qz as any).printers;
    if (qzPrinters && qzPrinters.getDefault) {
      const printer = await qzPrinters.getDefault();
      return printer;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to get default printer:', error);
    return null;
  }
}

// Format text for thermal printer (80mm/58mm)
function formatLine(text: string, width: number = 48): string {
  return text.padEnd(width).substring(0, width);
}

function formatTwoColumn(left: string, right: string, width: number = 48): string {
  const rightLen = right.length;
  const leftLen = width - rightLen;
  return left.padEnd(leftLen).substring(0, leftLen) + right;
}

function centerText(text: string, width: number = 48): string {
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text;
}

function generateOrderReceipt(order: any): string[] {
  const commands: string[] = [];
  const width = 48; // 80mm thermal printer standard width

  // ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // Initialize printer
  commands.push(`${ESC}@`); // Initialize
  commands.push(`${ESC}a\x01`); // Center alignment

  // Store Header
  commands.push(`${ESC}!\x30`); // Double height + double width
  commands.push('RECEIPT\n');
  commands.push(`${ESC}!\x00`); // Normal text
  
  commands.push(centerText('Order Confirmation', width) + '\n');
  commands.push('\n');

  // Order Info
  commands.push(`${ESC}a\x00`); // Left alignment
  commands.push(formatTwoColumn(`ORDER #${order.id}`, order.date, width) + '\n');
  commands.push('='.repeat(width) + '\n');
  commands.push('\n');

  // Customer Details
  commands.push(`${ESC}!\x08`); // Bold
  commands.push('CUSTOMER DETAILS\n');
  commands.push(`${ESC}!\x00`); // Normal
  commands.push(`Name: ${order.customer.name}\n`);
  commands.push(`Phone: ${order.customer.phone}\n`);
  commands.push(`Sales By: ${order.salesBy}\n`);
  commands.push('\n');

  // Delivery Address
  commands.push(`${ESC}!\x08`); // Bold
  commands.push('DELIVERY ADDRESS\n');
  commands.push(`${ESC}!\x00`); // Normal
  commands.push(`${order.deliveryAddress.address}\n`);
  if (order.deliveryAddress.area) {
    commands.push(`${order.deliveryAddress.area}, ${order.deliveryAddress.zone}\n`);
  } else {
    commands.push(`${order.deliveryAddress.zone}\n`);
  }
  commands.push(`${order.deliveryAddress.city}, ${order.deliveryAddress.district}\n`);
  commands.push(`${order.deliveryAddress.division} - ${order.deliveryAddress.postalCode}\n`);
  commands.push('\n');

  commands.push('-'.repeat(width) + '\n');
  commands.push('\n');

  // Products Header
  commands.push(`${ESC}!\x08`); // Bold
  commands.push('ORDER ITEMS\n');
  commands.push(`${ESC}!\x00`); // Normal
  commands.push('='.repeat(width) + '\n');

  // Products
  order.products.forEach((product: any) => {
    const productName = product.productName.length > 40 
      ? product.productName.substring(0, 37) + '...' 
      : product.productName;
    
    commands.push(`${productName}\n`);
    commands.push(formatTwoColumn(
      `  ${product.size} x${product.qty} @ Tk${product.price}`,
      `Tk${product.amount.toLocaleString()}`,
      width
    ) + '\n');
    
    // Show barcodes if available
    const productWithBarcodes = product as any;
    if (productWithBarcodes.barcodes && productWithBarcodes.barcodes.length > 0) {
      const barcodesText = productWithBarcodes.barcodes.slice(0, 3).join(', ');
      commands.push(`  Barcodes: ${barcodesText}\n`);
    }
    commands.push('\n');
  });

  commands.push('='.repeat(width) + '\n');
  commands.push('\n');

  // Calculations
  const subtotal = order.amounts?.subtotal || order.subtotal;
  commands.push(formatTwoColumn('Subtotal:', `Tk${subtotal.toLocaleString()}`, width) + '\n');

  if (order.amounts && order.amounts.totalDiscount > 0) {
    commands.push(formatTwoColumn('Discount:', `-Tk${order.amounts.totalDiscount.toLocaleString()}`, width) + '\n');
  }

  if (order.amounts) {
    commands.push(formatTwoColumn(`VAT (${order.amounts.vatRate}%):`, `Tk${order.amounts.vat.toLocaleString()}`, width) + '\n');
  }

  if (order.amounts && order.amounts.transportCost > 0) {
    commands.push(formatTwoColumn('Transport:', `Tk${order.amounts.transportCost.toLocaleString()}`, width) + '\n');
  }

  commands.push('-'.repeat(width) + '\n');

  // Total
  commands.push(`${ESC}!\x18`); // Bold + Enlarged
  const total = order.amounts?.total || order.subtotal;
  commands.push(formatTwoColumn('TOTAL:', `Tk${total.toLocaleString()}`, width) + '\n');
  commands.push(`${ESC}!\x00`); // Normal
  commands.push('\n');

  // Payments
  commands.push(formatTwoColumn('Amount Paid:', `Tk${order.payments.totalPaid.toLocaleString()}`, width) + '\n');
  
  if (order.payments.due > 0) {
    commands.push(`${ESC}!\x08`); // Bold
    commands.push(formatTwoColumn('DUE AMOUNT:', `Tk${order.payments.due.toLocaleString()}`, width) + '\n');
    commands.push(`${ESC}!\x00`); // Normal
  }

  commands.push('\n');
  commands.push('='.repeat(width) + '\n');
  commands.push('\n');

  // Footer
  commands.push(`${ESC}a\x01`); // Center alignment
  commands.push('THANK YOU FOR YOUR BUSINESS\n');
  commands.push('----------------------------\n');
  commands.push('This is a computer-generated receipt\n');
  commands.push('\n\n\n');

  // Cut paper
  commands.push(`${GS}V\x41\x00`); // Full cut

  return commands;
}

export async function printReceipt(order: any, printerName?: string): Promise<boolean> {
  try {
    await connectQZ();

    if (typeof window === 'undefined' || !window.qz) {
      throw new Error('QZ Tray not available');
    }

    const printer = printerName || await getDefaultPrinter();
    if (!printer) {
      throw new Error('No printer selected');
    }

    const config = window.qz.configs.create(printer);
    const receiptData = generateOrderReceipt(order);

    await window.qz.print(config, receiptData);
    console.log(`✅ Receipt printed for order #${order.id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to print receipt:', error);
    throw error;
  }
}

export async function printBulkReceipts(orders: any[], printerName?: string): Promise<{ successCount: number; failCount: number }> {
  try {
    await connectQZ();

    if (typeof window === 'undefined' || !window.qz) {
      throw new Error('QZ Tray not available');
    }

    const printer = printerName || await getDefaultPrinter();
    if (!printer) {
      throw new Error('No printer selected');
    }

    const config = window.qz.configs.create(printer);
    
    let successCount = 0;
    let failCount = 0;

    for (const order of orders) {
      try {
        const receiptData = generateOrderReceipt(order);
        await window.qz.print(config, receiptData);
        successCount++;
        
        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to print order #${order.id}:`, error);
        failCount++;
      }
    }

    console.log(`✅ Bulk print completed: ${successCount} success, ${failCount} failed`);
    
    return { successCount, failCount };
  } catch (error) {
    console.error('❌ Failed to print bulk receipts:', error);
    throw error;
  }
}

// Check QZ Tray status
export async function checkQZStatus(): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  try {
    if (typeof window === 'undefined' || !window.qz) {
      return {
        connected: false,
        error: 'QZ Tray not loaded'
      };
    }

    await window.qz.websocket.connect();
    
    return {
      connected: true,
      version: (window.qz as any).version || 'Unknown'
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'QZ Tray not running'
    };
  }
}