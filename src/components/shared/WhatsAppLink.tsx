'use client';

import { whatsappUrl } from '@/lib/utils';

interface WhatsAppLinkProps {
  phone: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function WhatsAppLink({ phone, message, children, className }: WhatsAppLinkProps) {
  if (!phone) return <span className={className}>—</span>;

  return (
    <a
      href={whatsappUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className || 'text-green-600 hover:text-green-700 font-medium underline decoration-green-300 underline-offset-2 transition-colors'}
      onClick={(e) => e.stopPropagation()}
    >
      {children || phone}
    </a>
  );
}
