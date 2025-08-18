import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatPrice } from '@/lib/currency';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { items, totalAmount, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [isIndianUser, setIsIndianUser] = useState(true); // Detect based on phone or location
  
  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  // Auto-detect Indian user based on phone number
  useEffect(() => {
    if (customerInfo.phone.startsWith('+91') || customerInfo.phone.startsWith('91') || 
        (customerInfo.phone.length === 10 && /^[6-9]/.test(customerInfo.phone))) {
      setIsIndianUser(true);
    }
  }, [customerInfo.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer information
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all customer details",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'stripe') {
        if (!stripe || !elements) {
          return;
        }

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/order-success`,
          },
        });

        if (error) {
          toast({
            title: "Payment Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          clearCart();
          toast({
            title: "Payment Successful",
            description: "Thank you for your purchase!",
          });
          setLocation('/order-success');
        }
      } else {
        // Handle Indian payment methods (GPay, PhonePe, Paytm)
        const amount = totalAmount;
        const merchantInfo = {
          name: "Palaniappa Jewellers",
          vpa: "jewelrypalaniappa@ybl", // Example UPI ID
          merchantCode: "PALANIAPPA"
        };

        if (paymentMethod === 'gpay') {
          // Google Pay UPI deep link
          const gpayUrl = `googlepay://pay?pa=${merchantInfo.vpa}&pn=${encodeURIComponent(merchantInfo.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Jewelry Purchase from Palaniappa Jewellers')}`;
          
          toast({
            title: "Redirecting to Google Pay",
            description: "Opening Google Pay app...",
          });
          
          // Try to open GPay app, fallback to web
          window.location.href = gpayUrl;
          
          // Fallback to web version if app doesn't open
          setTimeout(() => {
            if (document.hidden === false) {
              window.open(`https://pay.google.com/about/`, '_blank');
            }
          }, 1000);
        } 
        
        else if (paymentMethod === 'phonepe') {
          // PhonePe UPI deep link
          const phonePeUrl = `phonepe://pay?pa=${merchantInfo.vpa}&pn=${encodeURIComponent(merchantInfo.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Jewelry Purchase')}`;
          
          toast({
            title: "Redirecting to PhonePe",
            description: "Opening PhonePe app...",
          });
          
          window.location.href = phonePeUrl;
          
          // Fallback to web version
          setTimeout(() => {
            if (document.hidden === false) {
              window.open(`https://www.phonepe.com/`, '_blank');
            }
          }, 1000);
        } 
        
        else if (paymentMethod === 'paytm') {
          // Paytm UPI deep link
          const paytmUrl = `paytmmp://pay?pa=${merchantInfo.vpa}&pn=${encodeURIComponent(merchantInfo.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Jewelry Purchase')}`;
          
          toast({
            title: "Redirecting to Paytm",
            description: "Opening Paytm app...",
          });
          
          window.location.href = paytmUrl;
          
          // Fallback to web version
          setTimeout(() => {
            if (document.hidden === false) {
              window.open(`https://paytm.com/`, '_blank');
            }
          }, 1000);
        }
        
        // Simulate payment completion for demo (in real app, this would be handled by webhook)
        setTimeout(() => {
          clearCart();
          toast({
            title: "Payment Successful",
            description: "Thank you for your purchase!",
          });
          setLocation('/order-success');
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product.images[0] || "https://images.unsplash.com/photo-1603561596112-db2eca6c9df4?w=100"}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <h3 className="font-medium text-sm">{item.product.name}</h3>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">
                      {formatPrice(parseFloat(item.product.priceInr) * item.quantity, 'INR')}
                    </span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatPrice(totalAmount, 'INR')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Payment & Shipping Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Customer Information</h3>
                    
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        required
                        data-testid="input-customer-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        required
                        data-testid="input-customer-email"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        required
                        data-testid="input-customer-phone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                        required
                        data-testid="input-customer-address"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method Selection */}
                  {isIndianUser && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Payment Method</h3>
                      <RadioGroup 
                        value={paymentMethod} 
                        onValueChange={setPaymentMethod}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value="stripe" id="stripe" />
                          <Label htmlFor="stripe" className="flex items-center cursor-pointer">
                            💳 Credit/Debit Card
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value="gpay" id="gpay" />
                          <Label htmlFor="gpay" className="flex items-center cursor-pointer">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMjIgMTJMMTIgMjJMMiAxMkwxMiAyWiIgZmlsbD0iIzQyODVGNCIvPgo8cGF0aCBkPSJNMTIgN0wxNyAxMkwxMiAxN0w3IDEyTDEyIDdaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="GPay" className="w-5 h-5 mr-2"/>
                            Google Pay
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value="phonepe" id="phonepe" />
                          <Label htmlFor="phonepe" className="flex items-center cursor-pointer">
                            <div className="w-5 h-5 mr-2 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                              P
                            </div>
                            PhonePe
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value="paytm" id="paytm" />
                          <Label htmlFor="paytm" className="flex items-center cursor-pointer">
                            <div className="w-5 h-5 mr-2 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                              ₹
                            </div>
                            Paytm
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Payment Element */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">
                      {paymentMethod === 'stripe' ? 'Payment Information' : 'Payment Details'}
                    </h3>
                    
                    {paymentMethod === 'stripe' ? (
                      <PaymentElement />
                    ) : (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          {paymentMethod === 'gpay' && "You'll be redirected to Google Pay to complete your payment."}
                          {paymentMethod === 'phonepe' && "You'll be redirected to PhonePe to complete your payment."}
                          {paymentMethod === 'paytm' && "You'll be redirected to Paytm to complete your payment."}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={paymentMethod === 'stripe' ? !stripe || isProcessing : isProcessing}
                    className="w-full"
                    data-testid="button-pay"
                  >
                    {isProcessing ? 'Processing...' : 
                     paymentMethod === 'stripe' ? `Pay ${formatPrice(totalAmount, 'INR')}` :
                     paymentMethod === 'gpay' ? `Pay with Google Pay ${formatPrice(totalAmount, 'INR')}` :
                     paymentMethod === 'phonepe' ? `Pay with PhonePe ${formatPrice(totalAmount, 'INR')}` :
                     `Pay with Paytm ${formatPrice(totalAmount, 'INR')}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, totalAmount } = useCart();
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect if cart is empty
    if (items.length === 0) {
      setLocation('/');
      return;
    }

    // Create PaymentIntent when component loads
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: totalAmount,
      items: items.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: parseFloat(item.product.priceInr)
      }))
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error('Error creating payment intent:', error);
      });
  }, [items, totalAmount, setLocation]);

  if (items.length === 0) {
    return null; // Will redirect
  }

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}