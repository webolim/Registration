import React from 'react';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../constants';
import { Phone, Mail, ArrowLeft } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Decorative Top Bar */}
      <div className="h-2 bg-gradient-to-r from-orange-400 via-orange-600 to-orange-800"></div>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://raw.githubusercontent.com/webolim/Valmiki-Ramayana-Conference-2026/refs/heads/studio/assets/WEBOLIM_RGBLogo_20250521.gif" 
              alt="Webolim Logo" 
              className="h-12 md:h-16 w-auto object-contain"
            />
            <div className="hidden sm:block h-10 w-px bg-orange-200"></div>
            <div>
              <h1 className="text-sm md:text-xl font-bold text-gray-900 leading-tight">Sri Ramayana Satram & Conference 2026</h1>
              <p className="text-orange-600 text-xs font-bold tracking-wide uppercase">Participant Registration</p>
            </div>
          </div>

          <a 
            href="https://webolim.github.io/Valmiki-Ramayana-Conference-2026/"
            className="flex items-center text-sm font-medium text-gray-500 hover:text-orange-700 transition-colors ml-2"
            title="Back to Conference Page"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Back to Conference</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-4">Questions regarding the event?</p>
          <div className="flex flex-col md:flex-row justify-center items-center space-y-3 md:space-y-0 md:space-x-6">
            <a href={`tel:${CONTACT_PHONE}`} className="flex items-center text-orange-700 font-medium hover:text-orange-900 transition group">
              <div className="bg-orange-100 p-2 rounded-full mr-2 group-hover:bg-orange-200 transition-colors">
                <Phone className="w-4 h-4 text-orange-600" />
              </div>
              {CONTACT_PHONE}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center text-orange-700 font-medium hover:text-orange-900 transition group">
              <div className="bg-orange-100 p-2 rounded-full mr-2 group-hover:bg-orange-200 transition-colors">
                <Mail className="w-4 h-4 text-orange-600" />
              </div>
              {CONTACT_EMAIL}
            </a>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-orange-200 mx-2"></div>

            <a 
              href="https://webolim.github.io/Valmiki-Ramayana-Conference-2026/" 
              className="flex items-center text-orange-700 font-medium hover:text-orange-900 transition group"
            >
              <div className="bg-orange-100 p-2 rounded-full mr-2 group-hover:bg-orange-200 transition-colors">
                <ArrowLeft className="w-4 h-4 text-orange-600" />
              </div>
              Back to Conference Page
            </a>
          </div>
          <p className="mt-8 text-xs text-gray-400">&copy; 2026 WEBOLIM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
