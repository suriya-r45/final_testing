import { X, Plus, Minus, ShoppingBag, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/currency";
import { useLocation } from "wouter";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalItems, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    onClose();
    setLocation("/checkout");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        data-testid="cart-backdrop"
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({totalItems})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-cart"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500" data-testid="text-empty-cart">
                Your cart is empty
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                  data-testid={`cart-item-${item.product.id}`}
                >
                  <img
                    src={item.product.images[0] || "https://images.unsplash.com/photo-1603561596112-db2eca6c9df4?w=100"}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate" data-testid={`cart-item-name-${item.product.id}`}>
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-500" data-testid={`cart-item-price-${item.product.id}`}>
                      {formatPrice(parseFloat(item.product.priceInr), 'INR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      data-testid={`button-decrease-cart-${item.product.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-8 text-center text-sm font-medium" data-testid={`cart-quantity-${item.product.id}`}>
                      {item.quantity}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      data-testid={`button-increase-cart-${item.product.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`button-remove-cart-${item.product.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span data-testid="cart-total">
                {formatPrice(totalAmount, 'INR')}
              </span>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleCheckout}
                className="w-full"
                data-testid="button-checkout"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </Button>
              
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full"
                data-testid="button-clear-cart"
              >
                Clear Cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}