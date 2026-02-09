import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RegistrationData } from '../types';
import { EVENT_DATES } from '../constants';
import { Loader2, Trash2, Download, Search, RefreshCw, X, Lock, Unlock, ShieldCheck, BarChart3, Users, FileBarChart, Utensils, Calendar } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registrations'>('dashboard');

  // Simple hardcoded password for demonstration
  const ADMIN_PASSWORD = "sri-rama-admin"; 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getAll();
      setRegistrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setPassword('');
    } else {
      alert("Invalid Password");
    }
  };

  const handleDelete = async (mobile: string) => {
    if (!isAuthenticated) return;
    if (!window.confirm("Are you sure you want to delete this registration? This cannot be undone.")) return;
    
    try {
      await api.delete(mobile);
      setRegistrations(prev => prev.filter(r => r.primaryParticipant.mobile !== mobile));
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const downloadCSV = () => {
    if (registrations.length === 0) return;

    // Flatten data for CSV
    const rows = registrations.map(reg => ({
      'Registration ID': reg.id,
      'Submission Date': new Date(reg.submissionDate).toLocaleString(),
      'Full Name': reg.primaryParticipant.fullName,
      'Mobile': reg.primaryParticipant.mobile,
      'Age': reg.primaryParticipant.age,
      'Gender': reg.primaryParticipant.gender,
      'City': reg.primaryParticipant.city,
      'Attending Dates': reg.attendingDates.join('; '),
      'Total Guests': reg.additionalGuests.length,
      'Guest Details': reg.additionalGuests.map(g => `${g.fullName} (${g.age}, ${g.gender})`).join('; '),
      'Accommodation Required': reg.accommodation.required ? 'Yes' : 'No',
      'Accommodation Count': reg.accommodation.required ? reg.accommodation.memberIds.length : 0,
      'Check-in': reg.accommodation.required ? `${reg.accommodation.arrivalDate} ${reg.accommodation.arrivalTime}` : '',
      'Check-out': reg.accommodation.required ? `${reg.accommodation.departureDate} ${reg.accommodation.departureTime}` : '',
      'Food Packet Required': reg.food.takeawayRequired ? 'Yes' : 'No',
      'Food Packet Count': reg.food.takeawayRequired ? reg.food.packetCount : 0,
      'Food Pickup': reg.food.takeawayRequired ? `${reg.food.pickupDate} ${reg.food.pickupTime}` : ''
    }));

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(header => `"${String((row as any)[header]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registrations_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const processDashboardStats = () => {
    // Initialize stats structure for each event date
    const stats: Record<string, any> = {};
    EVENT_DATES.forEach(d => {
       stats[d] = {
         date: d.split('(')[0].trim(),
         originalDate: d,
         registrationsCount: 0, // Number of forms covering this date
         participants: { male: 0, female: 0, total: 0 }, // Number of actual people
         accommodation: { male: 0, female: 0, total: 0 },
         foodPackets: 0
       };
    });

    registrations.forEach(reg => {
       // Combine primary and guests
       const allParticipants = [reg.primaryParticipant, ...reg.additionalGuests];

       // 1. Attendance Stats
       reg.attendingDates.forEach(date => {
         if (stats[date]) {
            stats[date].registrationsCount++; // Increment form count for this date

            allParticipants.forEach(p => {
               const gender = (p.gender === 'Male' || p.gender === 'Female') ? p.gender.toLowerCase() : 'male'; // fallback to male for 'other' or handle distinct
               stats[date].participants[gender]++;
               stats[date].participants.total++;
            });
         }
       });

       // 2. Accommodation Stats
       if (reg.accommodation.required && reg.accommodation.arrivalDate && reg.accommodation.departureDate) {
         const checkIn = new Date(reg.accommodation.arrivalDate);
         const checkOut = new Date(reg.accommodation.departureDate);
         checkIn.setHours(0,0,0,0);
         checkOut.setHours(0,0,0,0);

         const accommodatedMembers = allParticipants.filter(p => reg.accommodation.memberIds.includes(p.id));

         EVENT_DATES.forEach(date => {
            const current = new Date(date.split('(')[0].trim());
            current.setHours(0,0,0,0);
            
            // Logic: Count accommodation if the current date is part of their stay.
            // Typically "staying for the night of X" means CheckIn <= X < CheckOut
            if (current >= checkIn && current < checkOut) {
               accommodatedMembers.forEach(p => {
                  const gender = (p.gender === 'Male' || p.gender === 'Female') ? p.gender.toLowerCase() : 'male';
                  stats[date].accommodation[gender]++;
                  stats[date].accommodation.total++;
               });
            }
         });
       }

       // 3. Food Stats
       if (reg.food.takeawayRequired && reg.food.pickupDate) {
          const pickupDate = new Date(reg.food.pickupDate);
          pickupDate.setHours(0,0,0,0);

          EVENT_DATES.forEach(date => {
             const current = new Date(date.split('(')[0].trim());
             current.setHours(0,0,0,0);
             if (current.getTime() === pickupDate.getTime()) {
                stats[date].foodPackets += (reg.food.packetCount || 0);
             }
          });
       }
    });

    // Return ordered array matching EVENT_DATES indices
    return EVENT_DATES.map(d => stats[d]);
  };

  const filteredRegistrations = registrations.filter(reg => 
    reg.primaryParticipant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.primaryParticipant.mobile.includes(searchTerm) ||
    reg.primaryParticipant.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dashboardStats = processDashboardStats();
  
  // Totals for Summary Cards
  const totalRegistrationsCount = registrations.length;
  const totalGuestsCount = registrations.reduce((acc, r) => acc + r.additionalGuests.length, 0);
  const totalParticipants = totalRegistrationsCount + totalGuestsCount;
  const totalFoodRequestCount = registrations.reduce((acc, r) => acc + (r.food.takeawayRequired ? r.food.packetCount : 0), 0);

  // Helper for date formatting
  const formatAdminDate = (dateStr: string) => {
    // dateStr format "March 28, 2026"
    const raw = dateStr.split('(')[0].trim();
    const date = new Date(raw);
    // Returns "Saturday, March 28"
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatMobileDate = (dateStr: string) => {
    const raw = dateStr.split('(')[0].trim();
    const date = new Date(raw);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Section Definitions
  const SECTIONS = [
    { 
      id: 'pre', 
      title: 'Pre-Conference Days', 
      indices: [0, 1, 2, 3, 4, 5, 6], 
      color: 'bg-blue-50 text-blue-900 border-blue-200' 
    },
    { 
      id: 'conf', 
      title: 'Conference Days', 
      indices: [7, 8], 
      color: 'bg-purple-50 text-purple-900 border-purple-200' 
    },
    { 
      id: 'post', 
      title: 'Post-Conference Days', 
      indices: [9, 10], 
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200' 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Decorative Top Bar */}
      <div className="h-1.5 bg-gradient-to-r from-orange-400 via-orange-600 to-orange-800"></div>

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">Admin Access Required</h3>
                    <p className="text-sm text-gray-500 mt-1">Please enter the password to enable edit/delete actions.</p>
                 </div>
                 <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleLogin}>
                 <div className="mb-6">
                   <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                   <input 
                      type="password" 
                      autoFocus
                      placeholder="Enter password..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                   />
                 </div>
                 <button type="submit" className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition flex justify-center items-center shadow-lg shadow-orange-200">
                    <Unlock className="w-4 h-4 mr-2" /> Unlock Admin Actions
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
               <img 
                 src="https://raw.githubusercontent.com/webolim/Valmiki-Ramayana-Conference-2026/refs/heads/studio/assets/WEBOLIM_RGBLogo_20250521.gif" 
                 alt="Webolim Logo" 
                 className="h-10 md:h-12 w-auto object-contain"
               />
               <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
               <div>
                 <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-none">2026 Conference Registrations</h1>
                 <p className="text-xs text-gray-500 mt-0.5 font-medium">Sri Ramayana Satram</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={fetchData} 
                 className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" 
                 title="Refresh Data"
               >
                 <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
               </button>
               
               {isAuthenticated ? (
                 <button 
                   onClick={() => setIsAuthenticated(false)} 
                   className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                 >
                   <Lock className="w-4 h-4 mr-2" /> Logout
                 </button>
               ) : (
                 <button 
                   onClick={() => setShowLoginModal(true)} 
                   className="flex items-center px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg text-sm font-bold transition shadow-sm"
                 >
                   <Unlock className="w-4 h-4 mr-2" /> Login
                 </button>
               )}
            </div>
          </div>
        </div>
        
        {/* Tab Bar */}
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8">
             <button 
               onClick={() => setActiveTab('dashboard')}
               className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'dashboard' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               <BarChart3 className="w-4 h-4 mr-2" /> Daily Report
             </button>
             <button 
               onClick={() => setActiveTab('registrations')}
               className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'registrations' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               <Users className="w-4 h-4 mr-2" /> Registration Details
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* DASHBOARD TAB (Default View) */}
        {activeTab === 'dashboard' && (
           <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6"/></div>
                    <div>
                       <p className="text-sm font-medium text-gray-500">Total Participants</p>
                       <h3 className="text-2xl font-bold text-gray-900">{totalParticipants}</h3>
                       <p className="text-xs text-gray-400">{totalRegistrationsCount} registrations</p>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><FileBarChart className="w-6 h-6"/></div>
                    <div>
                       <p className="text-sm font-medium text-gray-500">Accommodation Requests</p>
                       <h3 className="text-2xl font-bold text-gray-900">
                          {registrations.filter(r => r.accommodation.required).length}
                       </h3>
                       <p className="text-xs text-gray-400">Total Groups</p>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Utensils className="w-6 h-6"/></div>
                    <div>
                       <p className="text-sm font-medium text-gray-500">Total Food Packets</p>
                       <h3 className="text-2xl font-bold text-gray-900">{totalFoodRequestCount}</h3>
                       <p className="text-xs text-gray-400">Takeaway Orders</p>
                    </div>
                 </div>
              </div>

              {/* Main Report Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 text-sm md:text-base">11-Day Event Overview</h3>
                  <span className="text-xs font-medium text-gray-500">Live Data</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-white uppercase tracking-wider">
                      <tr>
                        {/* Sticky Date Column Header */}
                        <th className="p-2 md:p-4 text-[10px] md:text-xs font-bold border-r border-gray-700 sticky left-0 z-20 bg-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] w-16 md:w-auto md:min-w-[160px]">
                           <span className="md:hidden">Date</span>
                           <span className="hidden md:inline">Event Date</span>
                        </th>
                        
                        <th className="p-2 md:p-4 text-[10px] md:text-xs text-center border-r border-gray-700 w-12 md:w-24 md:min-w-[100px]">
                           <span className="md:hidden">Reg</span>
                           <span className="hidden md:inline">Forms</span>
                        </th>
                        <th className="p-2 md:p-4 text-[10px] md:text-xs text-center border-r border-gray-700 bg-blue-900/40 w-16 md:w-auto md:min-w-[200px]" style={{ width: '25%' }}>
                           <span className="md:hidden">Attn</span>
                           <span className="hidden md:inline">Attendance</span>
                        </th>
                        <th className="p-2 md:p-4 text-[10px] md:text-xs text-center border-r border-gray-700 bg-green-900/40 w-16 md:w-auto md:min-w-[200px]" style={{ width: '25%' }}>
                           <span className="md:hidden">Stay</span>
                           <span className="hidden md:inline">Accommodation</span>
                        </th>
                        <th className="p-2 md:p-4 text-[10px] md:text-xs text-center bg-orange-900/40 w-14 md:w-auto md:min-w-[100px]" style={{ width: '25%' }}>
                           <span className="md:hidden">Food</span>
                           <span className="hidden md:inline">Food</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                      {SECTIONS.map(section => (
                        <React.Fragment key={section.id}>
                          {/* Section Header */}
                          <tr className={`${section.color} border-y`}>
                             <td colSpan={5} className="p-2 md:p-3 pl-2 md:pl-4 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                <div className="sticky left-0 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1 md:mr-2 opacity-70" /> 
                                  <span className="md:hidden">{section.title.replace('Days', '')}</span>
                                  <span className="hidden md:inline">{section.title}</span>
                                </div>
                             </td>
                          </tr>
                          
                          {/* Data Rows */}
                          {section.indices.map(index => {
                             const row = dashboardStats[index];
                             if (!row) return null;
                             return (
                                <tr key={row.date} className="hover:bg-gray-50 transition border-b border-gray-100 group">
                                   {/* Sticky Date Cell */}
                                   <td className="p-2 md:p-4 font-bold text-gray-700 border-r border-gray-100 sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      <span className="md:hidden whitespace-nowrap">{formatMobileDate(row.originalDate)}</span>
                                      <span className="hidden md:inline">{formatAdminDate(row.originalDate)}</span>
                                   </td>
                                   
                                   {/* Forms */}
                                   <td className="p-2 md:p-4 text-center border-r border-gray-100">
                                      <span className="inline-block px-2 py-0.5 md:px-2.5 md:py-1 bg-gray-100 rounded-md font-bold text-gray-600">
                                         {row.registrationsCount}
                                      </span>
                                   </td>

                                   {/* Attendance */}
                                   <td className="p-2 md:p-4 text-center bg-blue-50/20 border-r border-gray-100">
                                      <div className="flex flex-col items-center justify-center">
                                         <span className="text-sm md:text-2xl font-bold text-blue-700">{row.participants.total}</span>
                                         {row.participants.total > 0 && (
                                            <div className="flex flex-col md:flex-row gap-0.5 md:gap-3 text-[9px] md:text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                                               <span className="flex items-center" title="Male Participants">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 hidden md:block"></span>M:{row.participants.male}
                                               </span>
                                               <span className="flex items-center" title="Female Participants">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-1 hidden md:block"></span>F:{row.participants.female}
                                               </span>
                                            </div>
                                         )}
                                      </div>
                                   </td>
                                   
                                   {/* Accommodation */}
                                   <td className="p-2 md:p-4 text-center bg-green-50/20 border-r border-gray-100">
                                      <div className="flex flex-col items-center justify-center">
                                         <span className="text-sm md:text-2xl font-bold text-green-700">{row.accommodation.total}</span>
                                         {row.accommodation.total > 0 && (
                                            <div className="flex flex-col md:flex-row gap-0.5 md:gap-3 text-[9px] md:text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                                               <span className="flex items-center" title="Male Accommodation">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 hidden md:block"></span>M:{row.accommodation.male}
                                               </span>
                                               <span className="flex items-center" title="Female Accommodation">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-1 hidden md:block"></span>F:{row.accommodation.female}
                                               </span>
                                            </div>
                                         )}
                                      </div>
                                   </td>
                                   
                                   {/* Food */}
                                   <td className="p-2 md:p-4 text-center bg-orange-50/20">
                                      <div className="flex flex-col items-center justify-center">
                                        <span className="text-sm md:text-2xl font-bold text-orange-700">{row.foodPackets}</span>
                                        <span className="hidden md:inline text-[10px] text-orange-400 mt-1 font-semibold uppercase">Packets</span>
                                      </div>
                                   </td>
                                </tr>
                             );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
        )}

        {/* REGISTRATIONS LIST TAB */}
        {activeTab === 'registrations' && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-6">
             
             {/* Controls */}
             <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-orange-100 w-full md:w-96">
                  <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="bg-transparent border-none outline-none flex-grow text-gray-700 text-sm placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-400 hover:text-gray-600 transition" /></button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button onClick={downloadCSV} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs md:text-sm font-medium transition text-gray-700 shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </button>
                </div>
             </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm text-gray-600 border-collapse">
                  <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-[10px] md:text-xs">
                    <tr>
                      {/* Sticky Participant Column Header */}
                      <th className="p-2 md:p-4 border-b border-gray-200 sticky left-0 z-20 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-32 md:w-auto md:min-w-[200px]">Participant</th>
                      
                      <th className="p-2 md:p-4 border-b border-gray-200 md:min-w-[150px]">Attendance</th>
                      <th className="p-2 md:p-4 border-b border-gray-200 md:min-w-[150px]">Guests</th>
                      <th className="p-2 md:p-4 border-b border-gray-200 md:min-w-[150px]">Stay</th>
                      <th className="p-2 md:p-4 border-b border-gray-200 md:min-w-[150px]">Food</th>
                      {isAuthenticated && <th className="p-2 md:p-4 border-b border-gray-200 text-right md:min-w-[100px]"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50 transition group">
                        {/* Sticky Participant Cell */}
                        <td className="p-2 md:p-4 align-top sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100">
                          <div className="font-bold text-gray-900 truncate max-w-[120px] md:max-w-none">{reg.primaryParticipant.fullName}</div>
                          <div className="text-orange-600 font-medium text-[10px] md:text-sm">{reg.primaryParticipant.mobile}</div>
                          <div className="text-gray-400 text-[9px] md:text-xs md:block hidden">{reg.primaryParticipant.city}</div>
                          <div className="text-gray-400 text-[9px] md:text-xs mt-0.5 md:mt-1">{reg.primaryParticipant.gender.charAt(0)}, {reg.primaryParticipant.age}y</div>
                        </td>
                        
                        <td className="p-2 md:p-4 align-top">
                          <div className="flex flex-wrap gap-1 max-w-[100px] md:max-w-[200px]">
                            {reg.attendingDates.length > 5 ? (
                               <span className="text-[10px] md:text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">{reg.attendingDates.length} Days</span>
                            ) : (
                                reg.attendingDates.map(d => (
                                  <span key={d} className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-blue-50 text-blue-700 text-[9px] md:text-[10px] rounded border border-blue-100 whitespace-nowrap">
                                    {d.split('(')[0].trim().split(',')[0].replace('March ', 'Mar ').replace('April ', 'Apr ')}
                                  </span>
                                ))
                            )}
                          </div>
                        </td>
                        <td className="p-2 md:p-4 align-top">
                          {reg.additionalGuests.length > 0 ? (
                            <div>
                              <span className="font-bold text-gray-900 block text-[10px] md:text-sm">{reg.additionalGuests.length} Guests</span>
                              <ul className="text-[9px] md:text-xs text-gray-500 mt-1 list-disc list-inside hidden md:block">
                                {reg.additionalGuests.map(g => (
                                  <li key={g.id} className="truncate max-w-[150px]">{g.fullName}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-2 md:p-4 align-top">
                          {reg.accommodation.required ? (
                            <div>
                              <span className="inline-block px-1.5 py-0.5 md:px-2 md:py-1 bg-green-100 text-green-800 text-[9px] md:text-xs font-bold rounded mb-1 whitespace-nowrap">Yes ({reg.accommodation.memberIds.length})</span>
                              <div className="text-[9px] md:text-xs text-gray-500 whitespace-nowrap hidden md:block">
                                <span className="text-gray-400">In:</span> {reg.accommodation.arrivalDate.split('-').slice(1).join('/')}<br/>
                                <span className="text-gray-400">Out:</span> {reg.accommodation.departureDate.split('-').slice(1).join('/')}
                              </div>
                            </div>
                          ) : <span className="text-gray-300 text-[10px] md:text-sm">No</span>}
                        </td>
                        <td className="p-2 md:p-4 align-top">
                          {reg.food.takeawayRequired ? (
                            <div>
                              <span className="inline-block px-1.5 py-0.5 md:px-2 md:py-1 bg-yellow-100 text-yellow-800 text-[9px] md:text-xs font-bold rounded mb-1 whitespace-nowrap">Yes ({reg.food.packetCount})</span>
                            </div>
                          ) : <span className="text-gray-300 text-[10px] md:text-sm">No</span>}
                        </td>
                        
                        {isAuthenticated && (
                          <td className="p-2 md:p-4 align-top text-right">
                            <button 
                              onClick={() => handleDelete(reg.primaryParticipant.mobile)}
                              className="p-1 md:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Registration"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <tr>
                        <td colSpan={isAuthenticated ? 6 : 5} className="p-8 md:p-12 text-center">
                           <div className="flex flex-col items-center justify-center text-gray-400">
                              <Search className="w-8 h-8 md:w-10 md:h-10 mb-3 opacity-20"/>
                              <p className="text-base md:text-lg font-medium text-gray-500">No registrations found</p>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
