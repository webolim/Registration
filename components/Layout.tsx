import React from 'react';
import { BookOpen } from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../constants';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Decorative Top Bar */}
      <div className="h-2 bg-gradient-to-r from-orange-400 via-orange-600 to-orange-800"></div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 md:py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Sri Ramayana Satram & Conference 2026</h1>
              <p className="text-orange-600 text-xs md:text-sm font-medium tracking-wide">Participant Registration Form</p>
            </div>
          </div>
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
          <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-8">
            <a href={`tel:${CONTACT_PHONE}`} className="flex items-center text-orange-700 font-medium hover:text-orange-900 transition">
              <span className="bg-orange-100 p-1.5 rounded-full mr-2">📞</span> 
              {CONTACT_PHONE}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center text-orange-700 font-medium hover:text-orange-900 transition">
              <span className="bg-orange-100 p-1.5 rounded-full mr-2">✉️</span> 
              {CONTACT_EMAIL}
            </a>
          </div>
          <p className="mt-8 text-xs text-gray-400">&copy; 2026 Sri Ramayana Satram. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};