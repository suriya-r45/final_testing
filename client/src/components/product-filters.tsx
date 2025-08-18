import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Filter, X } from 'lucide-react';
import { JEWELRY_CATEGORIES } from '@shared/schema';
import { ProductFilters, MATERIALS, GENDERS, OCCASIONS } from '@shared/cart-schema';

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

export default function ProductFiltersComponent({ filters, onFiltersChange }: ProductFiltersProps) {
  const onClearFilters = () => {
    onFiltersChange({});
  };
  const [isOpen, setIsOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([filters.priceMin || 0, filters.priceMax || 500000]);

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
    handleFilterChange('priceMin', values[0]);
    handleFilterChange('priceMax', values[1]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.subCategory) count++;
    if (filters.material) count++;
    if (filters.gender) count++;
    if (filters.occasion) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.inStock) count++;
    return count;
  };

  const selectedCategory = filters.category && JEWELRY_CATEGORIES[filters.category as keyof typeof JEWELRY_CATEGORIES];

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filters</h3>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {getActiveFiltersCount() > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="button-toggle-filters"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            {isOpen ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search products..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                data-testid="input-search"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => {
                  handleFilterChange('category', value || undefined);
                  handleFilterChange('subCategory', undefined); // Reset subcategory
                }}
                data-testid="select-category"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {Object.entries(JEWELRY_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            {selectedCategory && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={filters.subCategory || ''}
                  onValueChange={(value) => handleFilterChange('subCategory', value || undefined)}
                  data-testid="select-subcategory"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Subcategories</SelectItem>
                    {Object.entries(selectedCategory.subCategories).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Material */}
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                value={filters.material || ''}
                onValueChange={(value) => handleFilterChange('material', value || undefined)}
                data-testid="select-material"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Materials</SelectItem>
                  {Object.entries(MATERIALS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={filters.gender || ''}
                onValueChange={(value) => handleFilterChange('gender', value || undefined)}
                data-testid="select-gender"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Genders</SelectItem>
                  {Object.entries(GENDERS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Occasion */}
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select
                value={filters.occasion || ''}
                onValueChange={(value) => handleFilterChange('occasion', value || undefined)}
                data-testid="select-occasion"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Occasions</SelectItem>
                  {Object.entries(OCCASIONS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range (₹)</Label>
              <div className="px-2">
                <Slider
                  value={priceRange}
                  onValueChange={handlePriceChange}
                  max={500000}
                  min={0}
                  step={1000}
                  className="w-full"
                  data-testid="slider-price"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>₹{priceRange[0].toLocaleString()}</span>
                  <span>₹{priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={filters.sortBy || ''}
                onValueChange={(value) => handleFilterChange('sortBy', value || undefined)}
                data-testid="select-sort"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="name_asc">Name: A to Z</SelectItem>
                  <SelectItem value="name_desc">Name: Z to A</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="weight_asc">Weight: Light to Heavy</SelectItem>
                  <SelectItem value="weight_desc">Weight: Heavy to Light</SelectItem>
                  <SelectItem value="stock">In Stock First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Filter */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inStock"
                checked={filters.inStock || false}
                onCheckedChange={(checked) => handleFilterChange('inStock', checked)}
                data-testid="checkbox-in-stock"
              />
              <Label htmlFor="inStock" className="text-sm">
                Show only items in stock
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}