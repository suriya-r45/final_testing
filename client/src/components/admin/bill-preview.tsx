import { useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bill } from '@shared/schema';
import { useAuth } from '@/lib/auth';
import logoPath from '@assets/1000284180_1755240849891.jpg';

interface BillPreviewProps {
  bill: Bill;
  onClose: () => void;
}

export default function BillPreview({ bill, onClose }: BillPreviewProps) {
  const { token } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/bills/${bill.id}/pdf`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bill.customerName.replace(/\s+/g, '_')}_${bill.billNumber || 'bill'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-bill-preview">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center no-print" data-testid="header-bill-preview">
          <h3 className="text-xl font-semibold text-black">Bill Preview</h3>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="hidden md:flex"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              data-testid="button-close-preview"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Bill Content - A4 Format */}
        <div className="p-8 bg-white" style={{ width: '210mm', margin: '0 auto' }} data-testid="content-bill">
          {/* Header with Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center items-center mb-4">
              <img
                src="/attached_assets/1000284180_1755240849891_1755538055896.jpg"
                alt="Palaniappa Jewellers Logo"
                className="w-32 h-32 object-contain mr-4"
              />
            </div>
            <div className="text-right text-xs text-gray-600" data-testid="customer-copy-info">
              <p>CUSTOMER COPY</p>
              <p>Date: {new Date(bill.createdAt!).toLocaleString()}</p>
            </div>
          </div>

          {/* Bill Information Section */}
          <div className="border border-gray-300 mb-4">
            <div className="bg-gray-100 p-2">
              <h2 className="font-bold text-black">TAX INVOICE</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4">
              {/* Company Details */}
              <div className="text-xs">
                <p><strong>PALANIAPPA JEWELLERS</strong></p>
                <p>Premium Jewelry Store</p>
                <p>123 Jewelry Street</p>
                <p>Chennai, Tamil Nadu</p>
                <p>PINCODE: 600001</p>
                <p>Phone Number: +919597201554</p>
                <p>GSTIN: 33AAACT5712A124</p>
                <p>Email: jewelerypalaniappa@gmail.com</p>
              </div>

              {/* Customer Details */}
              <div className="text-xs" data-testid="customer-details">
                <p><strong>CUSTOMER DETAILS:</strong></p>
                <p className="font-medium">{bill.customerName}</p>
                <p>{bill.customerPhone}</p>
                <p>{bill.customerEmail}</p>
                <p>{bill.customerAddress}</p>
              </div>
            </div>
          </div>

          {/* Product Table */}
          <div className="border border-gray-300 mb-4">
            <table className="w-full text-xs bill-table" data-testid="table-bill-items">
              <thead>
                <tr className="bg-gray-100">
                  <th>Product Description</th>
                  <th>Qty</th>
                  <th>Gross Weight(gms)</th>
                  <th>Net Weight(gms)</th>
                  <th>Product Price</th>
                  <th>Making Charges</th>
                  <th>{bill.currency === 'BHD' ? 'VAT (5%)' : 'SGST (1.5%)'}</th>
                  <th>{bill.currency === 'BHD' ? '' : 'CGST (1.5%)'}</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index} data-testid={`row-item-${index}`}>
                    <td>{item.productName}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">{item.grossWeight}g</td>
                    <td className="text-center">{item.netWeight}g</td>
                    <td className="text-center">
                      {bill.currency === 'INR'
                        ? `₹${parseInt(item.priceInr).toLocaleString()}`
                        : `BD ${parseFloat(item.priceBhd).toFixed(3)}`
                      }
                    </td>
                    <td className="text-center">
                      {bill.currency === 'INR' ? '₹' : 'BD'}{item.makingCharges}
                    </td>
                    <td className="text-center">
                      {bill.currency === 'BHD' 
                        ? `BD ${parseFloat(bill.gst).toFixed(2)}`
                        : `₹${item.sgst}`
                      }
                    </td>
                    <td className="text-center">
                      {bill.currency === 'BHD' ? '' : `₹${item.cgst}`}
                    </td>
                    <td className="text-center font-medium">
                      {bill.currency === 'INR' ? '₹' : 'BD'}{item.total}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="font-bold">Total</td>
                  <td className="text-center">
                    {bill.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="text-center">
                    {bill.items.reduce((sum, item) => sum + parseFloat(item.grossWeight), 0).toFixed(2)}g
                  </td>
                  <td className="text-center">
                    {bill.items.reduce((sum, item) => sum + parseFloat(item.netWeight), 0).toFixed(2)}g
                  </td>
                  <td className="text-center">-</td>
                  <td className="text-center">
                    {bill.currency === 'INR' ? '₹' : 'BD'}{bill.makingCharges}
                  </td>
                  <td className="text-center">
                    {bill.currency === 'BHD' 
                      ? `BD ${parseFloat(bill.gst).toFixed(2)}`
                      : `₹${(parseFloat(bill.gst) / 2).toFixed(2)}`
                    }
                  </td>
                  <td className="text-center">
                    {bill.currency === 'BHD' ? '' : `₹${(parseFloat(bill.gst) / 2).toFixed(2)}`}
                  </td>
                  <td className="text-center font-bold">
                    {bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.total).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-gray-300 p-2">
              <p><strong>Payment Details</strong></p>
              <table className="w-full mt-2">
                <thead>
                  <tr>
                    <th className="text-left">Payment Mode</th>
                    <th className="text-left">Amount ({bill.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{bill.paymentMethod}</td>
                    <td>{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.paidAmount).toLocaleString()}</td>
                  </tr>
                  <tr className="font-bold border-t">
                    <td>Total Amount Paid</td>
                    <td>{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.paidAmount).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-gray-300 p-2">
              <p><strong>Bill Summary</strong></p>
              <table className="w-full mt-2">
                <tbody>
                  <tr>
                    <td>Subtotal:</td>
                    <td className="text-right">{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.subtotal).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Making Charges:</td>
                    <td className="text-right">{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.makingCharges).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>{bill.currency === 'BHD' ? 'VAT:' : 'GST:'}</td>
                    <td className="text-right">{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.gst).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Discount:</td>
                    <td className="text-right">{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.discount).toLocaleString()}</td>
                  </tr>
                  <tr className="font-bold border-t">
                    <td>Total Amount:</td>
                    <td className="text-right">{bill.currency === 'INR' ? '₹' : 'BD'}{parseFloat(bill.total).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-2 text-xs">
                Value in words: {bill.currency === 'INR' ? 'Rupees' : 'Bahrain Dinars'} {convertNumberToWords(parseFloat(bill.total))} Only
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-600">
            <p>This is a computer-generated bill.No signature required</p>
            <p>Thank you for shopping with Palaniappa Jewellery!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert numbers to words (simplified version)
function convertNumberToWords(num: number): string {
  if (num === 0) return 'zero';

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const thousands = ['', 'thousand', 'million', 'billion'];

  function convertHundreds(n: number): string {
    let result = '';

    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }

    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }

    if (n > 0) {
      result += ones[n] + ' ';
    }

    return result;
  }

  let result = '';
  let thousandCounter = 0;

  while (num > 0) {
    if (num % 1000 !== 0) {
      result = convertHundreds(num % 1000) + thousands[thousandCounter] + ' ' + result;
    }
    num = Math.floor(num / 1000);
    thousandCounter++;
  }

  return result.trim();
}
