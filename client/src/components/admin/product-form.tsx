import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Product } from '@shared/schema';
import { Currency } from '@/lib/currency';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ProductFormProps {
  currency: Currency;
}

export default function ProductForm({ currency }: ProductFormProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    priceInr: '',
    priceBhd: '',
    grossWeight: '',
    netWeight: '',
    stock: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!token,
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest('POST', '/api/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product added successfully!",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    
    selectedFiles.forEach(file => {
      data.append('images', file);
    });

    addProductMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      priceInr: '',
      priceBhd: '',
      grossWeight: '',
      netWeight: '',
      stock: ''
    });
    setSelectedFiles([]);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Product Form */}
      <Card data-testid="card-add-product">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Product</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-add-product">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                  data-testid="input-product-name"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RINGS">Rings 💍</SelectItem>
                    <SelectItem value="NECKLACES_CHAINS">Necklaces & Chains 📿</SelectItem>
                    <SelectItem value="EARRINGS">Earrings 🌸</SelectItem>
                    <SelectItem value="BRACELETS_BANGLES">Bracelets & Bangles 🔗</SelectItem>
                    <SelectItem value="PENDANTS_LOCKETS">Pendants & Lockets ✨</SelectItem>
                    <SelectItem value="MANGALSUTRA">Mangalsutra & Thali Chains 🖤</SelectItem>
                    <SelectItem value="NOSE_JEWELLERY">Nose Jewellery 👃</SelectItem>
                    <SelectItem value="ANKLETS_TOE_RINGS">Anklets & Toe Rings 👣</SelectItem>
                    <SelectItem value="BROOCHES_PINS">Brooches & Pins 🎀</SelectItem>
                    <SelectItem value="KIDS_JEWELLERY">Kids Jewellery 🧒</SelectItem>
                    <SelectItem value="BRIDAL_COLLECTIONS">Bridal & Special Collections 👰</SelectItem>
                    <SelectItem value="MATERIAL_GEMSTONE">Shop by Material / Gemstone 💎</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter detailed description"
                rows={3}
                required
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceInr">Price (INR)</Label>
                <Input
                  id="priceInr"
                  type="number"
                  step="0.01"
                  value={formData.priceInr}
                  onChange={(e) => setFormData({ ...formData, priceInr: e.target.value })}
                  placeholder="0"
                  required
                  data-testid="input-price-inr"
                />
              </div>
              
              <div>
                <Label htmlFor="priceBhd">Price (BHD)</Label>
                <Input
                  id="priceBhd"
                  type="number"
                  step="0.001"
                  value={formData.priceBhd}
                  onChange={(e) => setFormData({ ...formData, priceBhd: e.target.value })}
                  placeholder="0.000"
                  required
                  data-testid="input-price-bhd"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grossWeight">Gross Weight (g)</Label>
                <Input
                  id="grossWeight"
                  type="number"
                  step="0.1"
                  value={formData.grossWeight}
                  onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                  placeholder="0.0"
                  required
                  data-testid="input-gross-weight"
                />
              </div>
              
              <div>
                <Label htmlFor="netWeight">Net Weight (g)</Label>
                <Input
                  id="netWeight"
                  type="number"
                  step="0.1"
                  value={formData.netWeight}
                  onChange={(e) => setFormData({ ...formData, netWeight: e.target.value })}
                  placeholder="0.0"
                  required
                  data-testid="input-net-weight"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                required
                data-testid="input-stock"
              />
            </div>

            <div>
              <Label htmlFor="images">Product Images</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-images"
                />
                <label htmlFor="images" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload images or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="preview-images">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        data-testid={`button-remove-image-${index}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800"
              disabled={addProductMutation.isPending}
              data-testid="button-add-product"
            >
              {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Product List */}
      <Card data-testid="card-product-inventory">
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-gray-500 text-center py-8" data-testid="message-no-products">
                No products added yet.
              </p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg p-4 border shadow-sm" data-testid={`item-product-${product.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={product.images[0] || "https://images.unsplash.com/photo-1603561596112-db2eca6c9df4?w=60"}
                        alt={product.name}
                        className="w-15 h-15 rounded-lg object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-black">{product.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={product.stock > 5 ? "default" : product.stock > 0 ? "destructive" : "secondary"}>
                            Stock: {product.stock}
                          </Badge>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          ₹{parseInt(product.priceInr).toLocaleString('en-IN')} | BD {parseFloat(product.priceBhd).toFixed(3)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProduct(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deleteProductMutation.isPending}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
