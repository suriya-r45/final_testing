import { useEffect } from 'react';
import { CheckCircle, Home, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useCart } from '@/lib/cart';

export default function OrderSuccess() {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart when reaching success page
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-800">
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-gray-600">
                  Thank you for your purchase! Your order has been confirmed and will be processed shortly.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>You will receive a confirmation email soon</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => setLocation('/')}
                  className="w-full"
                  data-testid="button-continue-shopping"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.open('https://wa.me/97333444088', '_blank')}
                  className="w-full"
                  data-testid="button-whatsapp-support"
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}