import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Currency, CURRENCY_NAMES } from '@/lib/currency';
import CartButton from '@/components/cart/cart-button';
import GoldRatesTicker from '@/components/gold-rates-ticker';
import logoPath from '@assets/1000284180_1755240849891.jpg';

interface HeaderProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
}

export default function Header({ selectedCurrency, onCurrencyChange }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <>
      <GoldRatesTicker />
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" data-testid="header-main">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold">
              <img 
                src={logoPath} 
                alt="Palaniappa Jewellers Logo" 
                className="w-full h-full object-cover"
              />
            </div>

              <div>
                <h1 className="text-xl font-bold text-black">PALANIAPPA JEWELLERS</h1>
                <p className="text-xs text-gray-500">Since 2025</p>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`transition-colors ${location === '/' ? 'text-black font-medium' : 'text-gray-700 hover:text-black'}`} data-testid="nav-home">
              Home
            </Link>
            <a href="#products" className="text-gray-700 hover:text-black transition-colors" data-testid="nav-products">
              Products
            </a>
            <a href="#about" className="text-gray-700 hover:text-black transition-colors" data-testid="nav-about">
              About
            </a>
            <a href="#contact" className="text-gray-700 hover:text-black transition-colors" data-testid="nav-contact">
              Contact
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <CartButton />
            <Select value={selectedCurrency} onValueChange={onCurrencyChange} data-testid="select-currency">
              <SelectTrigger className="w-32 flex items-center" data-testid="trigger-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR" data-testid="option-inr">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 rounded-sm" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="8" fill="#FF9933"/>
                      <rect y="8" width="24" height="8" fill="#FFFFFF"/>
                      <rect y="16" width="24" height="8" fill="#138808"/>
                      <circle cx="12" cy="12" r="3" fill="#000080"/>
                    </svg>
                    <span>₹ INR</span>
                  </div>
                </SelectItem>
                <SelectItem value="BHD" data-testid="option-bhd">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 rounded-sm" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="12" fill="#FFFFFF"/>
                      <rect y="12" width="24" height="12" fill="#CE1126"/>
                      <path d="M0 0 L8 6 L0 12 V8 L4 6 L0 4 Z" fill="#CE1126"/>
                    </svg>
                    <span>BD BHD</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              {user ? (
                <div className="flex items-center space-x-2">
                  {isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" data-testid="button-admin-dashboard">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-1"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{user.name}</span>
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button className="bg-black text-white hover:bg-gray-800" data-testid="button-login">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
