import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RegistrationData } from '../types';
import { Loader2, Trash2, Download, Search, RefreshCw, X } from 'lucide-react';
import { EVENT_DATES } from '../constants';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Simple hardcoded password for demonstration
  const ADMIN_PASSWORD = "sri-ram-admin"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Invalid Password");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getAll();
      setRegistrations(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mobile: string) => {
    if (!window.confirm("Are you sure you want to delete this registration? This cannot be undone.")) return;
    
    try {
      await api.delete(mobile);
      setRegistrations(prev => prev.filter(r => r.primaryParticipant.mobile !== mobile));
      setDeleteConfirm(null);
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

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-orange-100 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Enter admin password"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-h-screen">
      <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold">Admin Dashboard</h2>
          <p className="text-gray-400 text-xs">Manage Registrations</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchData} className="p-2 hover:bg-gray-800 rounded-lg transition" title="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-bold transition">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
          <button onClick={() => setIsAuthenticated(false)} className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition">
            Logout
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search by Name, Mobile or City..." 
            className="bg-transparent border-none outline-none flex-grow text-gray-700 font-medium placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
          )}
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Showing {filteredRegistrations.length} of {registrations.length} records
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 border-b">Participant</th>
                <th className="p-4 border-b">Attendance</th>
                <th className="p-4 border-b">Guests</th>
                <th className="p-4 border-b">Stay</th>
                <th className="p-4 border-b">Food</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 align-top">
                    <div className="font-bold text-gray-900">{reg.primaryParticipant.fullName}</div>
                    <div className="text-orange-600">{reg.primaryParticipant.mobile}</div>
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
                  <td className="p-4 align-top text-right">
                    <button 
                      onClick={() => handleDelete(reg.primaryParticipant.mobile)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Delete Registration"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">No registrations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};