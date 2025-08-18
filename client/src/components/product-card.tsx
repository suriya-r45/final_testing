import { useState } from 'react';
import { Heart, ShoppingCart, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/currency';
import { Product } from '@shared/schema';

interface ProductCardProps {
  product: Product;
  currency: 'INR' | 'BHD';
}

export default function ProductCard({ product, currency }: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const { toast } = useToast();

  const price = currency === 'BHD' ? parseFloat(product.priceBhd) : parseFloat(product.priceInr);
  const isInCartAlready = isInCart(product.id);
  const cartQuantity = getItemQuantity(product.id);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock",
        variant: "destructive",
      });
      return;
    }

    if (cartQuantity >= product.stock) {
      toast({
        title: "Stock Limit Reached",
        description: `Only ${product.stock} items available`,
        variant: "destructive",
      });
      return;
    }

    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this beautiful ${product.name} from Palaniappa Jewellers`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying URL
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Product link copied to clipboard",
    });
  };

  const handleWhatsAppInquiry = () => {
    const message = `Hi! I'm interested in this product:
    
*${product.name}*
Price: ${formatPrice(price, currency)}
Product ID: ${product.id}

Could you please provide more details?`;

    const whatsappUrl = `https://wa.me/97333444088?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-gray-100">
          {imageLoading && (
            <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={product.images[0] || "https://images.unsplash.com/photo-1603561596112-db2eca6c9df4?w=400"}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </div>

        {/* Stock Badge */}
        {product.stock <= 0 && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            Out of Stock
          </Badge>
        )}

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="sm"
          className={`absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
          }`}
          onClick={() => setIsLiked(!isLiked)}
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
        </Button>

        {/* Quick Actions - Show on Hover */}
        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 bg-white/90 backdrop-blur-sm"
              onClick={handleWhatsAppInquiry}
              data-testid={`button-inquiry-${product.id}`}
            >
              <svg 
                className="w-4 h-4 mr-1" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
              </svg>
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm"
              onClick={handleShare}
              data-testid={`button-share-${product.id}`}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 
              className="font-semibold text-sm line-clamp-2 flex-1 hover:text-yellow-600 cursor-pointer" 
              data-testid={`product-name-${product.id}`}
              onClick={() => window.location.href = `/product/${product.id}`}
            >
              {product.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Badge variant="outline" className="text-xs">
              {product.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {product.material}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary" data-testid={`product-price-${product.id}`}>
                {formatPrice(price, currency)}
              </p>
              {product.stock > 0 && product.stock <= 5 && (
                <p className="text-xs text-amber-600">
                  Only {product.stock} left
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="mt-4">
          {isInCartAlready ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">
                In Cart ({cartQuantity})
              </span>
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || cartQuantity >= product.stock}
                data-testid={`button-add-more-${product.id}`}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add More
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}