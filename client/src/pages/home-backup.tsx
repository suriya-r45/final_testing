import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ProductCard from '@/components/product-card';
import ProductFilters from '@/components/product-filters';
import WhatsAppFloat from '@/components/whatsapp-float';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, JEWELRY_CATEGORIES } from '@shared/schema';
import { Currency } from '@/lib/currency';
import { ProductFilters as IProductFilters } from '@shared/cart-schema';
import { MessageCircle, Phone, ArrowRight, Star, Sparkles, Crown, Gem } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";




export default function Home() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('INR');
  const [filters, setFilters] = useState<IProductFilters>({});

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Apply material filter
    if (filters.material) {
      filtered = filtered.filter(product => product.material === filters.material);
    }

    // Apply price range filter
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      filtered = filtered.filter(product => {
        const price = selectedCurrency === 'INR' ? parseFloat(product.priceInr) : parseFloat(product.priceBhd);
        const min = filters.priceMin || 0;
        const max = filters.priceMax || Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => product.stock > 0);
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price_asc':
            return parseFloat(selectedCurrency === 'INR' ? a.priceInr : a.priceBhd) -
              parseFloat(selectedCurrency === 'INR' ? b.priceInr : b.priceBhd);
          case 'price_desc':
            return parseFloat(selectedCurrency === 'INR' ? b.priceInr : b.priceBhd) -
              parseFloat(selectedCurrency === 'INR' ? a.priceInr : a.priceBhd);
          case 'newest':
            return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'name_desc':
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [allProducts, filters, selectedCurrency]);

  // Get category-specific products
  const goldProducts = useMemo(() => 
    allProducts.filter(product => 
      product.material?.includes('GOLD') || 
      product.category === 'RINGS' || 
      product.category === 'NECKLACES_CHAINS'
    ).slice(0, 8), [allProducts]
  );

  const silverProducts = useMemo(() => 
    allProducts.filter(product => 
      product.material?.includes('SILVER') ||
      product.category === 'ANKLETS_TOE_RINGS'
    ).slice(0, 8), [allProducts]
  );

  const diamondProducts = useMemo(() => 
    allProducts.filter(product => 
      product.material?.includes('DIAMOND') ||
      product.category === 'BRIDAL_COLLECTIONS'
    ).slice(0, 8), [allProducts]
  );

  const newArrivals = useMemo(() => 
    [...allProducts].sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ).slice(0, 8), [allProducts]
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="page-home">
      <Header
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-yellow-50 via-white to-yellow-50 py-20" data-testid="section-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold text-black mb-6 animate-fade-in">
              Exquisite Jewelry Collection
            </h1>
            <p className="text-xl text-gray-600 mb-8 animate-fade-in">
              Discover timeless elegance with our premium selection of handcrafted jewelry pieces
            </p>
            <Button className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-8 py-3 text-lg">
              Explore Collection <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Gold Section */}
      <section className="py-16 bg-gradient-to-r from-yellow-50 to-orange-50" data-testid="section-gold">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-8 w-8 text-yellow-600 mr-3" />
              <h2 className="text-4xl font-bold text-black">Gold Collection</h2>
              <Crown className="h-8 w-8 text-yellow-600 ml-3" />
            </div>
            <p className="text-xl text-gray-600">22K & 18K gold jewelry with intricate designs</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {goldProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={selectedCurrency}
              />
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-50">
              View All Gold Jewelry <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Silver Section */}
      <section className="py-16 bg-gradient-to-r from-gray-50 to-slate-50" data-testid="section-silver">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-gray-600 mr-3" />
              <h2 className="text-4xl font-bold text-black">Silver Collection</h2>
              <Star className="h-8 w-8 text-gray-600 ml-3" />
            </div>
            <p className="text-xl text-gray-600">Sterling silver jewelry with contemporary elegance</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {silverProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={selectedCurrency}
              />
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" className="border-gray-600 text-gray-600 hover:bg-gray-50">
              View All Silver Jewelry <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Diamond Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50" data-testid="section-diamond">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Gem className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-4xl font-bold text-black">Diamond Collection</h2>
              <Gem className="h-8 w-8 text-blue-600 ml-3" />
            </div>
            <p className="text-xl text-gray-600">Brilliant diamonds for life's precious moments</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {diamondProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={selectedCurrency}
              />
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              View All Diamond Jewelry <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-16 bg-gradient-to-r from-purple-50 to-pink-50" data-testid="section-new-arrivals">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-4xl font-bold text-black">New Arrivals</h2>
              <Sparkles className="h-8 w-8 text-purple-600 ml-3" />
            </div>
            <p className="text-xl text-gray-600">Latest additions to our exclusive collection</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={selectedCurrency}
              />
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
              View All New Arrivals <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* All Products Section with Filters */}
      <section className="py-16 bg-white" id="products" data-testid="section-products">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-black mb-4">Complete Collection</h2>
            <p className="text-xl text-gray-600">Browse our entire jewelry catalog</p>
          </div>

          <div className="lg:flex lg:gap-8">
            <aside className="lg:w-1/4 mb-8 lg:mb-0">
              <ProductFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </aside>

            <main className="lg:w-3/4">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                      <div className="h-64 bg-gray-300"></div>
                      <div className="p-4">
                        <div className="h-4 bg-gray-300 mb-2"></div>
                        <div className="h-4 bg-gray-300 mb-2 w-3/4"></div>
                        <div className="h-6 bg-gray-300"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-600">
                      Showing {filteredProducts.length} of {allProducts.length} products
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="grid-products">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={selectedCurrency}
                      />
                    ))}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12" data-testid="empty-products">
                      <div className="text-6xl mb-4">💍</div>
                      <h3 className="text-xl font-semibold text-black mb-2">No products found</h3>
                      <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
                      <Button
                        onClick={() => setFilters({})}
                        variant="outline"
                        data-testid="button-clear-filters"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-black mb-2">Silver Collection</h3>
                  <p className="text-gray-600 mb-4">925 sterling silver with contemporary designs</p>
                  <Button
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={() => setCategoryFilter('silver')}
                    data-testid="button-view-silver"
                  >
                    View Collection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Catalog with Filters */}
      <section className="py-16 bg-gray-50" id="products" data-testid="section-products">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-black mb-8">Our Products</h2>
          
          {/* Product Filters */}
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalProducts={allProducts.length}
            filteredProducts={filteredProducts.length}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse" data-testid={`skeleton-${i}`}>
                  <div className="h-64 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="grid-products">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currency={selectedCurrency}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12" data-testid="message-no-products">
                  <p className="text-gray-500 text-lg">No products found. Please try a different filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <section id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">Visit Our Stores</h2>
            <p className="text-lg text-gray-300">Experience our collections at our locations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Indian Store */}
            <div className="text-center">
              <div className="bg-gold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-playfair font-bold mb-4">India Store</h3>
              <div className="space-y-2 text-gray-300">
                <p className="text-lg">Salem, Tamil Nadu</p>
                <p>India</p>
              </div>
            </div>

            {/* Bahrain Store */}
            <div className="text-center">
              <div className="bg-gold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-playfair font-bold mb-4">Bahrain Store</h3>
              <div className="space-y-2 text-gray-300">
                <p className="text-lg">Gold City, Manama</p>
                <p>Kingdom of Bahrain</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="space-y-4">
              {/* <div className="flex space-x-4 mt-4">
                <button
                  // onClick={openWhatsAppGeneral}
                  className="text-green-500 hover:text-green-400 transition-colors"
                  data-testid="button-whatsapp-footer"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              </div> */}
              <div className="flex items-center justify-center space-x-4">
                <i className="fas fa-envelope text-gold"></i>
                <span className="text-lg">jewelerypalaniappa@gmail.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
