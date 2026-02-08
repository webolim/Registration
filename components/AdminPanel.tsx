import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RegistrationData } from '../types';
import { Loader2, Trash2, Download, Search, RefreshCw, X, Lock, Unlock, ShieldCheck } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Simple hardcoded password for demonstration
  const ADMIN_PASSWORD = "sri-ram-admin"; 

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
      // Fail silently for view-only users or show a toast in a real app
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

  const filteredRegistrations = registrations.filter(reg => 
    reg.primaryParticipant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.primaryParticipant.mobile.includes(searchTerm) ||
    reg.primaryParticipant.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-h-screen relative">
      
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
      <div className="bg-gray-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 gap-4 shadow-md">
        <div>
          <h2 className="text-xl font-bold flex items-center">
             Admin Dashboard
             {!isAuthenticated && <span className="ml-3 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">View Only</span>}
             {isAuthenticated && <span className="ml-3 px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded border border-green-700 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> Admin Mode</span>}
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">Manage Registrations Sri Ramayana Satram</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchData} className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white" title="Refresh Data">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>

          {isAuthenticated ? (
            <button 
              onClick={() => setIsAuthenticated(false)} 
              className="flex items-center px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-900/50 rounded-lg text-sm font-medium transition"
            >
              <Lock className="w-4 h-4 mr-2" /> Lock
            </button>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-orange-900/20"
            >
              <Unlock className="w-4 h-4 mr-2" /> Login
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Search Bar */}
        <div className="mb-6 flex items-center bg-gray-50 p-4 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search by Name, Mobile or City..." 
            className="bg-transparent border-none outline-none flex-grow text-gray-700 font-medium placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-400 hover:text-gray-600 transition" /></button>
          )}
        </div>

        <div className="text-sm text-gray-500 mb-4 flex justify-between items-center">
          <span>Showing {filteredRegistrations.length} of {registrations.length} records</span>
          {loading && <span className="flex items-center text-orange-600"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Updating...</span>}
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 border-b">Participant</th>
                <th className="p-4 border-b">Attendance</th>
                <th className="p-4 border-b">Guests</th>
                <th className="p-4 border-b">Stay</th>
                <th className="p-4 border-b">Food</th>
                {isAuthenticated && <th className="p-4 border-b text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 transition group">
                  <td className="p-4 align-top">
                    <div className="font-bold text-gray-900">{reg.primaryParticipant.fullName}</div>
                    <div className="text-orange-600 font-medium">{reg.primaryParticipant.mobile}</div>
                    <div className="text-gray-400 text-xs">{reg.primaryParticipant.city}</div>
                    <div className="text-gray-400 text-xs mt-1">{reg.primaryParticipant.gender}, {reg.primaryParticipant.age}y</div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {reg.attendingDates.map(d => (
                        <span key={d} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 whitespace-nowrap">
                          {d.split('(')[0].trim().split(',')[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    {reg.additionalGuests.length > 0 ? (
                      <div>
                        <span className="font-bold text-gray-900">{reg.additionalGuests.length} Guests</span>
                        <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                          {reg.additionalGuests.map(g => (
                            <li key={g.id}>{g.fullName}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    {reg.accommodation.required ? (
                      <div>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded mb-1">Yes ({reg.accommodation.memberIds.length})</span>
                        <div className="text-xs text-gray-500">
                          In: {reg.accommodation.arrivalDate}<br/>
                          Out: {reg.accommodation.departureDate}
                        </div>
                      </div>
                    ) : <span className="text-gray-300">No</span>}
                  </td>
                  <td className="p-4 align-top">
                    {reg.food.takeawayRequired ? (
                      <div>
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded mb-1">Yes ({reg.food.packetCount})</span>
                        <div className="text-xs text-gray-500">
                           {reg.food.pickupDate}
                        </div>
                      </div>
                    ) : <span className="text-gray-300">No</span>}
                  </td>
                  
                  {isAuthenticated && (
                    <td className="p-4 align-top text-right">
                      <button 
                        onClick={() => handleDelete(reg.primaryParticipant.mobile)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="Delete Registration"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={isAuthenticated ? 6 : 5} className="p-12 text-center">
                     <div className="flex flex-col items-center justify-center text-gray-400">
                        <Search className="w-10 h-10 mb-3 opacity-20"/>
                        <p className="text-lg font-medium text-gray-500">No registrations found</p>
                        <p className="text-sm">Try adjusting your search terms</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
