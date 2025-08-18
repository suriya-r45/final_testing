import { openWhatsAppGeneral } from '@/lib/whatsapp';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import logoPath from '@assets/1000284180_1755240849891.jpg';


export default function Footer() {
  return (
    <footer className="bg-black text-white py-12" data-testid="footer-main">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold">
                <img
                  src={logoPath}
                  alt="Palaniappa Jewellers Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold">PALANIAPPA JEWELLERS</h3>
                <p className="text-xs text-gray-400">Since 2025</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Premium jewelry crafted with precision and elegance for discerning customers worldwide.
            </p>
          </div>

          {/* <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-home">Home</a></li>
              <li><a href="#products" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-products">Products</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-about">About Us</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-contact">Contact</a></li>
            </ul>
          </div> */}

          <div>
            <h4 className="text-lg font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-category-gold">Gold Jewelry</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-category-diamond">Diamond Jewelry</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-category-silver">Silver Jewelry</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors" data-testid="link-category-custom">Custom Designs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p className="flex items-center space-x-2" data-testid="text-phone">
                <Phone className="h-4 w-4" />
                <span>+919597201554</span>
              </p>
              <p className="flex items-center space-x-2" data-testid="text-email">
                <Mail className="h-4 w-4" />
                <span>jewelerypalaniappa@gmail.com</span>
              </p>
              {/* <p className="flex items-center space-x-2" data-testid="text-address">
                <MapPin className="h-4 w-4" />
                <span>123 Jewelry Street, Chennai</span>
              </p> */}
              {/* <div className="flex space-x-4 mt-4">
                <button 
                  onClick={openWhatsAppGeneral}
                  className="text-green-500 hover:text-green-400 transition-colors"
                  data-testid="button-whatsapp-footer"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              </div> */}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Locations</h4>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium">India</h4>
                <p className="text-gray-300 text-sm">Salem, Tamil Nadu</p>
              </div>
              <div>
                <h4 className="text-white font-medium">Bahrain</h4>
                <p className="text-gray-300 text-sm">Gold City, Manama</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 Palaniappa Jewellers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
