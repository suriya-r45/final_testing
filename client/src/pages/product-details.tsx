import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart, Share2, Heart, Ruler, Weight, Package, Star } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import WhatsAppFloat from '@/components/whatsapp-float';
import { Product, JEWELRY_CATEGORIES } from '@shared/schema';
import { Currency } from '@/lib/currency';
import { useCart } from '@/lib/cart';
import { sendProductWhatsAppMessage } from '@/lib/whatsapp';
import { useToast } from '@/hooks/use-toast';

export default function ProductDetails() {
  const { id } = useParams();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('INR');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-300 h-96 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const price = selectedCurrency === 'INR' ? parseFloat(product.priceInr) : parseFloat(product.priceBhd);
  const currencySymbol = selectedCurrency === 'INR' ? '₹' : 'BD';
  const category = JEWELRY_CATEGORIES[product.category as keyof typeof JEWELRY_CATEGORIES];
  const images = product.images || ['/placeholder-jewelry.jpg'];

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleWhatsAppEnquiry = () => {
    const priceText = `${currencySymbol} ${price.toFixed(2)}`;
    sendProductWhatsAppMessage(product.name, priceText, selectedCurrency);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard!",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="page-product-details">
      <Header selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <span className="text-black">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg shadow-lg overflow-hidden">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="img-product-main"
              />
            </div>
            
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      index === selectedImageIndex ? 'border-yellow-600' : 'border-gray-200'
                    }`}
                    data-testid={`button-image-${index}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-black" data-testid="text-product-name">
                  {product.name}
                </h1>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleShare} data-testid="button-share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" data-testid="button-wishlist">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {category && (
                <Badge variant="secondary" className="mb-4" data-testid="badge-category">
                  {category.name}
                </Badge>
              )}
              
              <div className="text-4xl font-bold text-black mb-2" data-testid="text-product-price">
                {currencySymbol} {price.toFixed(2)}
              </div>
              
              {product.stock > 0 ? (
                <Badge className="bg-green-100 text-green-800" data-testid="badge-in-stock">
                  In Stock ({product.stock} available)
                </Badge>
              ) : (
                <Badge variant="destructive" data-testid="badge-out-of-stock">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Enhanced Product Description */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-black">Product Description</h3>
              <p className="text-gray-600 leading-relaxed" data-testid="text-product-description">
                {product.description}
              </p>
              
              {/* Additional Product Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-black mb-2">Why Choose This Piece?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Crafted with precision using traditional techniques</li>
                  <li>• Made from high-quality materials for lasting beauty</li>
                  <li>• Perfect for special occasions and everyday elegance</li>
                  <li>• Comes with authenticity certificate and warranty</li>
                  <li>• Expert craftsmanship by skilled artisans</li>
                </ul>
              </div>
            </div>

            {/* Product Specifications */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Ruler className="h-5 w-5 mr-2" />
                  Specifications
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {product.material && (
                    <div>
                      <span className="text-gray-600">Material:</span>
                      <span className="ml-2 font-medium">{product.material}</span>
                    </div>
                  )}
                  {product.grossWeight && (
                    <div className="flex items-center">
                      <Weight className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-gray-600">Gross Weight:</span>
                      <span className="ml-2 font-medium">{product.grossWeight}g</span>
                    </div>
                  )}
                  {product.netWeight && (
                    <div className="flex items-center">
                      <Weight className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-gray-600">Net Weight:</span>
                      <span className="ml-2 font-medium">{product.netWeight}g</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">{category?.name || product.category}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* WhatsApp Enquiry Button - Above Add to Cart */}
              <Button
                onClick={handleWhatsAppEnquiry}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                data-testid="button-whatsapp-enquiry"
              >
                <svg 
                  className="w-5 h-5 mr-2" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
                </svg>
                WhatsApp Enquiry
              </Button>
              
              {/* Add to Cart Button */}
              <div className="flex space-x-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-black text-white hover:bg-gray-800"
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="border-t pt-6 text-sm text-gray-600">
              <div className="flex items-center mb-2">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                <span>Lifetime warranty on gold jewelry</span>
              </div>
              <div className="flex items-center mb-2">
                <Package className="h-4 w-4 mr-2 text-blue-500" />
                <span>Free shipping on orders above ₹10,000</span>
              </div>
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-2 text-red-500" />
                <span>Handcrafted with love</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12">
          <Link href="/">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}