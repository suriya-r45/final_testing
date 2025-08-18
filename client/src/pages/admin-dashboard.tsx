import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import Header from '@/components/header';
import ProductForm from '@/components/admin/product-form';
import BillingForm from '@/components/admin/billing-form';
import BillPreview from '@/components/admin/bill-preview';
import { useQuery } from '@tanstack/react-query';
import { Product, Bill } from '@shared/schema';
import { Currency } from '@/lib/currency';
import { Package, FileText, TrendingUp, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAdmin, token } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('INR');
  const [activeTab, setActiveTab] = useState('products');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!isAdmin && !token) {
      window.location.href = '/login';
    }
  }, [isAdmin, token]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!token,
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
    queryFn: async () => {
      const response = await fetch('/api/bills', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch bills');
      return response.json();
    },
    enabled: !!token,
  });

  const totalRevenue = bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock < 5).length;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="page-admin-dashboard">
      <Header 
        selectedCurrency={selectedCurrency} 
        onCurrencyChange={setSelectedCurrency} 
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your jewelry store efficiently</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-products">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-bills">
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{bills.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-revenue">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-gold" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedCurrency === 'INR' ? '₹' : 'BD'} {totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-low-stock">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="tabs-admin">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products" data-testid="tab-products">Products Management</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">Billing System</TabsTrigger>
            <TabsTrigger value="bills" data-testid="tab-bills">Bills History</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <ProductForm currency={selectedCurrency} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <BillingForm 
              currency={selectedCurrency} 
              products={products} 
            />
          </TabsContent>

          <TabsContent value="bills" className="space-y-6">
            <Card data-testid="card-bills-history">
              <CardHeader>
                <CardTitle>Bills History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bills.length === 0 ? (
                    <p className="text-gray-500 text-center py-8" data-testid="message-no-bills">
                      No bills generated yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Bill No.</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Currency</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {bills.map((bill) => (
                            <tr key={bill.id} className="hover:bg-gray-50" data-testid={`row-bill-${bill.id}`}>
                              <td className="px-4 py-3 text-sm font-medium text-black">{bill.billNumber}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{bill.customerName}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {new Date(bill.createdAt!).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-black">
                                {bill.currency === 'INR' ? '₹' : 'BD'} {parseFloat(bill.total).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{bill.currency}</td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedBill(bill)}
                                    data-testid={`button-preview-${bill.id}`}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = `/api/bills/${bill.id}/pdf`;
                                      link.download = `${bill.customerName.replace(/\s+/g, '_')}_${bill.billNumber}.pdf`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    data-testid={`button-download-${bill.id}`}
                                  >
                                    Download
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card data-testid="card-analytics">
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Analytics dashboard coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bill Preview Modal */}
      {selectedBill && (
        <BillPreview
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
