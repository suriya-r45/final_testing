export function sendWhatsAppMessage(message: string, phone?: string) {
  // Default WhatsApp number for Palaniappa Jewellers
  const defaultPhone = "+966501234567"; // Replace with actual WhatsApp business number
  const whatsappPhone = phone || defaultPhone;
  
  // Clean phone number (remove non-digits except +)
  const cleanPhone = whatsappPhone.replace(/[^\d+]/g, '');
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Create WhatsApp URL
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  
  // Open WhatsApp in new tab/window
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

export function sendProductWhatsAppMessage(productName: string, productPrice: string, currency: string) {
  const message = `Hi! I'm interested in the ${productName} (${currency} ${productPrice}). Could you please provide more details and availability?`;
  sendWhatsAppMessage(message);
}

export function sendBillingWhatsAppMessage(billId: string, total: string, currency: string) {
  const message = `Hi! I have a billing inquiry regarding Bill ID: ${billId} for ${currency} ${total}. Could you please assist me?`;
  sendWhatsAppMessage(message);
}