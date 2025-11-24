
import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    const order = await request.json();

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 30;

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.setFontSize(options.fontSize || 10);
      doc.setFont('helvetica', options.fontStyle || 'normal');
      if (options.align === 'center') {
        doc.text(text, x, y, { align: 'center' });
      } else if (options.align === 'right') {
        doc.text(text, x, y, { align: 'right' });
      } else {
        doc.text(text, x, y);
      }
    };

    // Letterhead
    doc.setLineWidth(0.5);
    addText('RECEIPT', pageWidth / 2, yPos, { fontSize: 28, fontStyle: 'bold', align: 'center' });
    yPos += 8;
    addText('Order Confirmation', pageWidth / 2, yPos, { fontSize: 9, align: 'center' });
    yPos += 10;
    
    // Order meta
    addText(`ORDER #${order.id}`, 20, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText(order.date, pageWidth - 20, yPos, { fontSize: 10, align: 'right' });
    yPos += 10;
    
    // Draw line
    doc.setLineWidth(2);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 15;

    // Customer Details Section
    addText('CUSTOMER DETAILS', 20, yPos, { fontSize: 9, fontStyle: 'bold' });
    yPos += 7;
    addText(`Name: ${order.customer.name}`, 20, yPos, { fontSize: 9 });
    yPos += 5;
    addText(`Email: ${order.customer.email}`, 20, yPos, { fontSize: 9 });
    yPos += 5;
    addText(`Phone: ${order.customer.phone}`, 20, yPos, { fontSize: 9 });
    yPos += 5;
    addText(`Sales By: ${order.salesBy}`, 20, yPos, { fontSize: 9 });
    yPos += 10;

    // Delivery Address Section
    addText('DELIVERY ADDRESS', 20, yPos, { fontSize: 9, fontStyle: 'bold' });
    yPos += 7;
    addText(order.deliveryAddress.address, 20, yPos, { fontSize: 9 });
    yPos += 5;
    if (order.deliveryAddress.area) {
      addText(`${order.deliveryAddress.area}, ${order.deliveryAddress.zone}`, 20, yPos, { fontSize: 9 });
    } else {
      addText(order.deliveryAddress.zone, 20, yPos, { fontSize: 9 });
    }
    yPos += 5;
    addText(`${order.deliveryAddress.city}, ${order.deliveryAddress.district}`, 20, yPos, { fontSize: 9 });
    yPos += 5;
    addText(`${order.deliveryAddress.division} - ${order.deliveryAddress.postalCode}`, 20, yPos, { fontSize: 9 });
    yPos += 12;

    // Draw light line
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Products Table Header
    addText('ORDER ITEMS', 20, yPos, { fontSize: 9, fontStyle: 'bold' });
    yPos += 7;

    doc.setLineWidth(0.8);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    addText('Product', 20, yPos, { fontSize: 8, fontStyle: 'bold' });
    addText('Size', 90, yPos, { fontSize: 8, fontStyle: 'bold' });
    addText('Qty', 115, yPos, { fontSize: 8, fontStyle: 'bold' });
    addText('Price', 135, yPos, { fontSize: 8, fontStyle: 'bold' });
    addText('Amount', pageWidth - 20, yPos, { fontSize: 8, fontStyle: 'bold', align: 'right' });
    yPos += 3;

    doc.setLineWidth(0.8);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;

    // Products
    order.products.forEach((product: any) => {
      addText(product.productName.substring(0, 30), 20, yPos, { fontSize: 9 });
      addText(product.size, 90, yPos, { fontSize: 9 });
      addText(product.qty.toString(), 115, yPos, { fontSize: 9 });
      addText(`৳${product.price.toLocaleString()}`, 135, yPos, { fontSize: 9 });
      addText(`৳${product.amount.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, align: 'right' });
      yPos += 7;
    });

    doc.setLineWidth(0.8);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Calculations
    const calcStartX = pageWidth - 90;
    
    addText('Subtotal', calcStartX, yPos, { fontSize: 9 });
    addText(`৳${(order.amounts?.subtotal || order.subtotal).toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, align: 'right' });
    yPos += 6;

    if (order.amounts && order.amounts.totalDiscount > 0) {
      addText('Discount', calcStartX, yPos, { fontSize: 9 });
      addText(`-৳${order.amounts.totalDiscount.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, align: 'right' });
      yPos += 6;
    }

    if (order.amounts) {
      addText(`VAT (${order.amounts.vatRate}%)`, calcStartX, yPos, { fontSize: 9 });
      addText(`৳${order.amounts.vat.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, align: 'right' });
      yPos += 6;
    }

    if (order.amounts && order.amounts.transportCost > 0) {
      addText('Transport Cost', calcStartX, yPos, { fontSize: 9 });
      addText(`৳${order.amounts.transportCost.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, align: 'right' });
      yPos += 6;
    }

    yPos += 3;
    doc.setLineWidth(0.8);
    doc.line(calcStartX, yPos, pageWidth - 20, yPos);
    yPos += 7;

    addText('Total Amount', calcStartX, yPos, { fontSize: 11, fontStyle: 'bold' });
    addText(`৳${(order.amounts?.total || order.subtotal).toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 11, fontStyle: 'bold', align: 'right' });
    yPos += 10;

    // Paid amount (gray background simulation)
    doc.setFillColor(245, 245, 245);
    doc.rect(calcStartX - 5, yPos - 5, 95, 8, 'F');
    addText('Amount Paid', calcStartX, yPos, { fontSize: 9, fontStyle: 'bold' });
    addText(`৳${order.payments.totalPaid.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' });
    yPos += 10;

    // Due amount (black background)
    if (order.payments.due > 0) {
      doc.setFillColor(0, 0, 0);
      doc.rect(calcStartX - 5, yPos - 5, 95, 8, 'F');
      doc.setTextColor(255, 255, 255);
      addText('Balance Due', calcStartX, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(`৳${order.payments.due.toLocaleString()}`, pageWidth - 20, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    addText('THANK YOU FOR YOUR BUSINESS', pageWidth / 2, yPos, { fontSize: 8, align: 'center' });
    yPos += 5;
    addText('This is a computer-generated document', pageWidth / 2, yPos, { fontSize: 7, align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-order-${order.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}