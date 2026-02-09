import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { api } from './services/api';
import { RegistrationData, StepId } from './types';
import { EVENT_DATES, SUPABASE_URL } from './constants';
import { v4 as uuidv4 } from 'uuid';
import { 
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, 
  User, Calendar, Users, Home, Utensils, FileText, 
  Plus, Trash2, MapPin, Phone, AlertCircle, X, Edit3, PartyPopper, Lock
} from 'lucide-react';

// --- Types & Constants ---

const initialData: RegistrationData = {
  id: '',
  submissionDate: new Date().toISOString(),
  primaryParticipant: { id: '', fullName: '', age: 0, gender: 'Male', mobile: '', city: '' },
  attendingDates: [],
  additionalGuests: [],
  accommodation: { required: false, memberIds: [], dates: [], arrivalDate: '', arrivalTime: '', departureDate: '', departureTime: '' },
  food: { takeawayRequired: false, packetCount: 0, pickupDate: '', pickupTime: '' },
  status: 'draft'
};

const STEPS: { id: StepId; title: string; icon: any }[] = [
  { id: 'PRIMARY', title: 'Basics', icon: User },
  { id: 'ATTENDANCE', title: 'Dates', icon: Calendar },
  { id: 'GUESTS', title: 'Guests', icon: Users },
  { id: 'ACCOMMODATION', title: 'Stay', icon: Home },
  { id: 'FOOD', title: 'Food', icon: Utensils },
  { id: 'REVIEW', title: 'Review', icon: FileText },
];

// Date Categorization Helper
const DATE_GROUPS = {
  PRE: { 
    title: "Pre-Conference Days", 
    dates: EVENT_DATES.slice(0, 7) // Mar 28 - Apr 03
  },
  CONF: { 
    title: "Conference Days", 
    dates: EVENT_DATES.slice(7, 9) // Apr 04 - Apr 05
  },
  POST: { 
    title: "Post-Conference Days", 
    dates: EVENT_DATES.slice(9, 11) // Apr 06 - Apr 07
  }
};

// --- Helper Functions ---

const parseEventDate = (dateStr: string): Date => {
  const cleanStr = dateStr.split('(')[0].trim();
  return new Date(cleanStr);
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getDisplayDate = (date: string) => {
  const parts = date.split('(');
  const rawDateStr = parts[0].trim();
  const dateObj = new Date(rawDateStr);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateWithoutYear = rawDateStr.replace(', 2026', '').replace(' 2026', '');
  return `${dayName}, ${dateWithoutYear}`;
};

// Check if date is in past (IST)
const isDateInPastIST = (dateStr: string): boolean => {
  const dateParts = dateStr.split('(')[0].trim(); 
  const eventDate = new Date(dateParts);
  
  // Current IST Date Calculation
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000; 
  const istNow = new Date(utc + istOffset);
  
  // Reset time to midnight for strict date comparison
  istNow.setHours(0,0,0,0);
  eventDate.setHours(0,0,0,0);
  
  return eventDate < istNow;
};

// --- Reusable UI Components ---

const InputGroup = ({ label, required, children, subLabel }: { label: string, required?: boolean, children: React.ReactNode, subLabel?: string }) => (
  <div className="mb-5">
    <label className="block text-sm font-semibold text-gray-800 mb-1.5 flex items-center">
      {label} {required && <span className="text-orange-600 ml-1">*</span>}
    </label>
    {subLabel && <p className="text-xs text-gray-500 mb-2 leading-tight">{subLabel}</p>}
    {children}
  </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
  />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select 
      {...props} 
      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm text-gray-900 bg-white appearance-none hover:border-gray-400"
    />
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    </div>
  </div>
);

const DateOptionGroup = ({ 
  options, 
  selectedDate, 
  onChange, 
  name,
  disabled = false
}: { 
  options: Date[], 
  selectedDate: string, 
  onChange: (date: string) => void,
  name: string,
  disabled?: boolean
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {options.map((date) => {
      const value = formatDateForInput(date);
      const isSelected = selectedDate === value;
      return (
        <label 
          key={value}
          className={`
            relative flex items-center p-3 rounded-xl border-2 transition-all
            ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer'}
            ${isSelected 
              ? 'border-orange-500 bg-orange-50 shadow-sm' 
              : !disabled && 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50'}
          `}
        >
          <input 
            type="radio" 
            name={name}
            value={value}
            checked={isSelected}
            onChange={() => !disabled && onChange(value)}
            disabled={disabled}
            className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 disabled:text-gray-400"
          />
          <span className={`ml-3 font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
            {formatDisplayDate(date)}
          </span>
        </label>
      );
    })}
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="mb-8 border-b border-orange-100 pb-4">
    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
    {subtitle && <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">{subtitle}</p>}
  </div>
);

const SelectionCard = ({ selected, onClick, title, description, icon: Icon, disclaimer, alert }: any) => (
  <div 
    onClick={onClick}
    className={`
      cursor-pointer relative p-5 rounded-xl border-2 transition-all duration-200 flex items-start space-x-4
      ${selected 
        ? 'border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-200' 
        : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm'}
    `}
  >
    <div className={`p-3 rounded-full flex-shrink-0 ${selected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <h3 className={`font-bold text-base ${selected ? 'text-orange-900' : 'text-gray-900'}`}>{title}</h3>
      <p className="text-sm text-gray-600 mt-1 leading-snug">{description}</p>
      {disclaimer && (
        <p className="text-xs text-orange-700 bg-orange-100/50 p-2 rounded mt-2 font-medium inline-block">
          {disclaimer}
        </p>
      )}
      {alert && (
         <div className="flex items-start mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
           <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
           <span>{alert}</span>
         </div>
      )}
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>('PRIMARY');
  const [data, setData] = useState<RegistrationData>(initialData);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Search State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchMobile, setSearchMobile] = useState('');

  useEffect(() => {
    if(!SUPABASE_URL) setIsConfigured(false);
    setData(d => ({ ...d, id: uuidv4(), primaryParticipant: { ...d.primaryParticipant, id: uuidv4() } }));
  }, []);

  // --- Synchronization Logic (Moved to Top Level) ---
  // If accommodation is required, food date is LOCKED to Check-out Date
  const isLockedToCheckout = Boolean(data.accommodation.required && data.accommodation.departureDate);

  useEffect(() => {
    if (isLockedToCheckout && data.food.takeawayRequired && data.food.pickupDate !== data.accommodation.departureDate) {
       setData(d => ({...d, food: {...d.food, pickupDate: d.accommodation.departureDate}}));
    }
  }, [isLockedToCheckout, data.food.takeawayRequired, data.accommodation.departureDate]);

  // --- Actions ---

  const checkMobileAvailability = async (mobileValue: string) => {
    if (!mobileValue || mobileValue.length < 10) return;

    setLoading(true);
    try {
      const existing = await api.getByMobile(mobileValue);
      // If registration exists AND IDs don't match (meaning it's not the current user editing their own)
      if (existing && existing.id !== data.id) {
        setError("This mobile number is already registered. Please use the 'Modify Registration' option");
      } else {
         if (error && error.includes("mobile")) setError(null);
      }
    } catch (err) {
      console.error("Mobile check failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    // 1. Primary Step Validation
    if (step === 'PRIMARY') {
      if (!data.primaryParticipant.fullName || !data.primaryParticipant.mobile || !data.primaryParticipant.city) {
        setError("Please fill in all required fields.");
        return;
      }
      if (data.primaryParticipant.mobile.length < 10) {
        setError("Please enter a valid mobile number.");
        return;
      }

      setLoading(true);
      try {
        const existing = await api.getByMobile(data.primaryParticipant.mobile);
        if (existing && existing.id !== data.id) {
          setError("This mobile number is already registered. Please use the 'Modify Registration' option");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
        setError("Unable to verify mobile number. Please check your internet connection.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    // 2. Attendance Validation
    if (step === 'ATTENDANCE' && data.attendingDates.length === 0) {
      setError("Please select at least one date.");
      return;
    }

    // 3. Guests Validation
    if (step === 'GUESTS') {
      const invalidGuest = data.additionalGuests.find(g => !g.fullName.trim() || !g.age || g.age <= 0);
      if (invalidGuest) {
        setError("All added guests must have a valid Name and Age.");
        return;
      }
    }

    // 4. Accommodation Validation
    if (step === 'ACCOMMODATION' && data.accommodation.required) {
      if (data.accommodation.memberIds.length === 0) {
        setError("Please select at least one person requiring accommodation.");
        return;
      }
      
      if (!data.accommodation.arrivalDate || !data.accommodation.departureDate) {
        setError("Please select both check-in and check-out dates.");
        return;
      }
      
      if (new Date(data.accommodation.arrivalDate) >= new Date(data.accommodation.departureDate)) {
         setError("Check-out date must be after Check-in date.");
         return;
      }
    }

    // 5. Food Validation
    if (step === 'FOOD' && data.food.takeawayRequired) {
      if (!data.food.packetCount || data.food.packetCount <= 0) {
        setError("Please enter a valid number of food packets (minimum 1).");
        return;
      }
      // If accommodation is selected, date is auto-set, otherwise user must pick
      if (!data.food.pickupDate) {
        // If we are here, it means auto-set failed or user didn't pick
        if (data.accommodation.required && data.accommodation.departureDate) {
           // Should have been set automatically, try setting it now just in case
           setData(prev => ({...prev, food: {...prev.food, pickupDate: prev.accommodation.departureDate}}));
        } else {
           setError("Please select the Date of Requirement.");
           return;
        }
      }
    }
    
    setError(null);
    const currentIndex = STEPS.findIndex(s => s.id === step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError(null);
    const currentIndex = STEPS.findIndex(s => s.id === step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const finalData = { ...data, status: 'submitted' as const, submissionDate: new Date().toISOString() };
      await api.save(finalData);
      setIsSuccess(true);
      window.scrollTo(0,0);
    } catch (err: any) {
      setError(err.message || "Failed to save data. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchMobile || searchMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const existing = await api.getByMobile(searchMobile);
      if (existing) {
        setData(existing);
        setStep('PRIMARY');
        setIsSearchMode(false);
      } else {
        setError("No registration found with this mobile number.");
      }
    } catch (err: any) {
      setError("Unable to search: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper for Date Ranges ---

  const getAttendanceDateRange = () => {
    if (data.attendingDates.length === 0) return { first: null, last: null };

    const sortedDates = data.attendingDates
      .map(parseEventDate)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      first: sortedDates[0],
      last: sortedDates[sortedDates.length - 1]
    };
  };

  // --- Step Content Renderers ---

  const renderSearch = () => (
    <div className="step-enter py-4">
      <SectionTitle title="Find Registration" subtitle="Enter your mobile number to modify your existing details." />
      
      <div className="max-w-md mx-auto">
        <InputGroup label="Registered Mobile Number">
          <div className="relative">
            <StyledInput 
              autoFocus
              type="tel"
              value={searchMobile}
              onChange={e => setSearchMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            />
            <Phone className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
          </div>
        </InputGroup>

        <div className="flex flex-col space-y-3 mt-8">
          <button 
            onClick={performSearch}
            disabled={loading}
            className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition shadow-md flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Search Record"}
          </button>
          <button 
            onClick={() => { setIsSearchMode(false); setError(null); }}
            className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 transition"
          >
            Cancel and Go Back
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrimary = () => (
    <div className="step-enter">
      {/* Search Banner */}
      {!isSearchMode && (
         <div className="bg-orange-50 border-l-4 border-orange-500 shadow-md rounded-r-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-lg">
           <div className="flex items-start">
             <div className="bg-orange-100 p-2 rounded-full mr-4 text-orange-700 hidden sm:block">
               <Edit3 className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900">Have you already registered?</h3>
               <p className="text-sm text-gray-600 mt-1">Click here to search and modify your existing registration.</p>
             </div>
           </div>
           <button 
             onClick={() => { setIsSearchMode(true); setError(null); }}
             className="whitespace-nowrap px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition shadow-sm w-full sm:w-auto text-sm"
           >
             Modify Registration
           </button>
         </div>
      )}

      <SectionTitle title="Primary Participant" subtitle="Please provide your basic contact details." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <InputGroup label="Full Name" required>
          <StyledInput
            value={data.primaryParticipant.fullName}
            onChange={e => setData({...data, primaryParticipant: {...data.primaryParticipant, fullName: e.target.value}})}
            placeholder="Name as per ID proof"
          />
        </InputGroup>
        
        <InputGroup label="Mobile Number" required>
          <div className="relative">
            <StyledInput
              type="tel"
              value={data.primaryParticipant.mobile}
              onChange={e => {
                setData({...data, primaryParticipant: {...data.primaryParticipant, mobile: e.target.value}});
                if (error && error.includes("mobile")) setError(null);
              }}
              onBlur={(e) => checkMobileAvailability(e.target.value)}
              placeholder="10 digit number"
            />
            {loading ? (
              <div className="absolute right-3 top-3.5">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            ) : (
              <Phone className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
            )}
          </div>
        </InputGroup>

        <InputGroup label="Age" required>
          <StyledInput
            type="number"
            value={data.primaryParticipant.age || ''}
            onChange={e => setData({...data, primaryParticipant: {...data.primaryParticipant, age: parseInt(e.target.value) || 0}})}
            placeholder="Years"
          />
        </InputGroup>

        <InputGroup label="Gender" required>
          <StyledSelect
            value={data.primaryParticipant.gender}
            onChange={e => setData({...data, primaryParticipant: {...data.primaryParticipant, gender: e.target.value as any}})}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </StyledSelect>
        </InputGroup>

        <div className="md:col-span-2">
          <InputGroup label="Where will you be coming from" required>
             <div className="relative">
              <StyledInput
                value={data.primaryParticipant.city}
                onChange={e => setData({...data, primaryParticipant: {...data.primaryParticipant, city: e.target.value}})}
                placeholder="City / Town"
              />
               <MapPin className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
             </div>
          </InputGroup>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => {
    const renderDateGroup = (title: string, dates: string[]) => (
      <div className="mb-8 last:mb-0">
        <div className="flex items-center mb-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
          <div className="ml-3 h-px bg-gray-200 flex-grow"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dates.map(date => {
            const isSelected = data.attendingDates.includes(date);
            const displayDate = getDisplayDate(date);
            const isPast = isDateInPastIST(date);
            
            // Extract extra label inside brackets if any
            const parts = date.split('(');
            const extraRaw = parts[1] ? parts[1] : '';
            const extra = extraRaw.replace(')', '').trim();

            return (
              <div 
                key={date}
                onClick={() => {
                  if (isPast) return; // Disable click for past dates
                  if (isSelected) {
                    setData({...data, attendingDates: data.attendingDates.filter(d => d !== date)});
                  } else {
                    setData({...data, attendingDates: [...data.attendingDates, date]});
                  }
                }}
                className={`
                  relative overflow-hidden
                  p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                  ${isPast 
                    ? (isSelected 
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-80' 
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed')
                    : (isSelected 
                        ? 'border-orange-500 bg-orange-50 shadow-md cursor-pointer' 
                        : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 cursor-pointer')
                  }
                `}
              >
                <div>
                  <span className={`block font-bold ${isPast ? 'text-gray-500' : isSelected ? 'text-orange-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                    {displayDate}
                  </span>
                  {extra && <span className={`text-xs font-semibold block mt-1 ${isPast ? 'text-gray-400' : 'text-orange-600'}`}>{extra}</span>}
                  {isPast && isSelected && <span className="text-[10px] uppercase font-bold text-gray-500 mt-1 flex items-center"><Lock className="w-3 h-3 mr-1"/> Past Date</span>}
                  {isPast && !isSelected && <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Not Available</span>}
                </div>
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors 
                  ${isPast 
                     ? (isSelected ? 'border-gray-400 bg-gray-400' : 'border-gray-300 bg-transparent')
                     : (isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 group-hover:border-orange-300')
                  }
                `}>
                   {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );

    return (
      <div className="step-enter">
        <SectionTitle title="Event Attendance" subtitle="Select all the dates you plan to be present at the Satram." />
        
        {renderDateGroup(DATE_GROUPS.PRE.title, DATE_GROUPS.PRE.dates)}
        {renderDateGroup(DATE_GROUPS.CONF.title, DATE_GROUPS.CONF.dates)}
        {renderDateGroup(DATE_GROUPS.POST.title, DATE_GROUPS.POST.dates)}

        <p className="text-xs text-gray-400 mt-4 italic text-center">Past dates are disabled for new selection.</p>
      </div>
    );
  };

  const renderGuests = () => (
    <div className="step-enter">
      <SectionTitle title="Additional Guests" subtitle="Are you bringing family or friends? Add their details here." />
      
      {data.additionalGuests.length > 0 && (
        <div className="space-y-4 mb-8">
          {data.additionalGuests.map((guest, idx) => (
            <div key={guest.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={() => setData({
                  ...data, 
                  additionalGuests: data.additionalGuests.filter(g => g.id !== guest.id)
                })}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                title="Remove Guest"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">Guest {idx + 1}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-3">
                  <StyledInput
                    placeholder="Full Name"
                    value={guest.fullName}
                    onChange={e => {
                      const newGuests = [...data.additionalGuests];
                      newGuests[idx].fullName = e.target.value;
                      setData({...data, additionalGuests: newGuests});
                    }}
                  />
                </div>
                <div className="md:col-span-1">
                  <StyledInput
                    placeholder="Age"
                    type="number"
                    value={guest.age || ''}
                    onChange={e => {
                      const newGuests = [...data.additionalGuests];
                      newGuests[idx].age = parseInt(e.target.value) || 0;
                      setData({...data, additionalGuests: newGuests});
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <StyledSelect
                    value={guest.gender}
                    onChange={e => {
                      const newGuests = [...data.additionalGuests];
                      newGuests[idx].gender = e.target.value as any;
                      setData({...data, additionalGuests: newGuests});
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </StyledSelect>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setData({
          ...data, 
          additionalGuests: [...data.additionalGuests, { id: uuidv4(), fullName: '', age: 0, gender: 'Male' }]
        })}
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition flex items-center justify-center font-medium group"
      >
        <div className="bg-gray-100 p-1.5 rounded-full mr-2 group-hover:bg-orange-100 transition-colors">
          <Plus className="w-4 h-4" />
        </div>
        Add Guest
      </button>
    </div>
  );

  const renderAccommodation = () => {
    const { first, last } = getAttendanceDateRange();

    // Determine Valid Options
    // Check-in: First Date OR Previous Day
    const checkInOptions: Date[] = [];
    if (first) {
      const prevDay = new Date(first);
      prevDay.setDate(first.getDate() - 1);
      checkInOptions.push(prevDay);
      checkInOptions.push(first);
    }

    // Check-out: Last Date OR Next Day
    const checkOutOptions: Date[] = [];
    if (last) {
      checkOutOptions.push(last);
      const nextDay = new Date(last);
      nextDay.setDate(last.getDate() + 1);
      checkOutOptions.push(nextDay);
    }

    return (
      <div className="step-enter">
        <SectionTitle title="Accommodation" subtitle="Let us know if you require arrangements for your stay." />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <SelectionCard 
            selected={!data.accommodation.required}
            onClick={() => setData({...data, accommodation: {...data.accommodation, required: false}})}
            title="Not Required"
            description="I have made my own arrangements."
            icon={Home}
          />
          <SelectionCard 
            selected={data.accommodation.required}
            onClick={() => setData({...data, accommodation: {...data.accommodation, required: true}})}
            title="Accommodation Required"
            description="Please arrange a stay for me/us."
            icon={Home}
          />
        </div>

        {data.accommodation.required && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Who needs accommodation?</label>
              <div className="space-y-2">
                {[data.primaryParticipant, ...data.additionalGuests].map(p => {
                  const isChecked = data.accommodation.memberIds.includes(p.id);
                  return (
                    <label 
                      key={p.id} 
                      className={`
                        flex items-center p-3 rounded-lg border cursor-pointer transition-all
                        ${isChecked 
                          ? 'bg-orange-50 border-orange-300' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'}
                      `}
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 border-gray-300 mr-3"
                        checked={isChecked}
                        onChange={e => {
                          const ids = data.accommodation.memberIds;
                          const newIds = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                          setData({...data, accommodation: {...data.accommodation, memberIds: newIds}});
                        }}
                      />
                      <span className="font-medium text-gray-800">{p.fullName || 'Unnamed Guest'}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <InputGroup label="Check-in Date" subLabel="First event day or day before">
                  <DateOptionGroup 
                    name="arrivalDate"
                    options={checkInOptions}
                    selectedDate={data.accommodation.arrivalDate}
                    onChange={(d) => setData({...data, accommodation: {...data.accommodation, arrivalDate: d}})}
                  />
                </InputGroup>
                <div className="mt-2">
                   <label className="text-xs font-semibold text-gray-500 mb-1 block">Approx. Arrival Time</label>
                   <StyledInput type="time" value={data.accommodation.arrivalTime} onChange={e => setData({...data, accommodation: {...data.accommodation, arrivalTime: e.target.value}})} />
                </div>
              </div>

              <div>
                <InputGroup label="Check-out Date" subLabel="Last event day or day after">
                   <DateOptionGroup 
                    name="departureDate"
                    options={checkOutOptions}
                    selectedDate={data.accommodation.departureDate}
                    onChange={(d) => setData({...data, accommodation: {...data.accommodation, departureDate: d}})}
                  />
                </InputGroup>
                <div className="mt-2">
                   <label className="text-xs font-semibold text-gray-500 mb-1 block">Approx. Departure Time</label>
                   <StyledInput type="time" value={data.accommodation.departureTime} onChange={e => setData({...data, accommodation: {...data.accommodation, departureTime: e.target.value}})} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFood = () => {
    // Valid Options for Non-Accommodation users: Last Date OR Next Day (same as checkout logic)
    const { last } = getAttendanceDateRange();
    const foodDateOptions: Date[] = [];
    if (last) {
      foodDateOptions.push(last);
      const nextDay = new Date(last);
      nextDay.setDate(last.getDate() + 1);
      foodDateOptions.push(nextDay);
    }

    return (
      <div className="step-enter">
        <SectionTitle title="Return Journey Food" subtitle="We can provide food packets for your return journey." />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SelectionCard 
            selected={!data.food.takeawayRequired}
            onClick={() => setData({...data, food: {...data.food, takeawayRequired: false}})}
            title="No"
            description="I do not need food packets."
            icon={Utensils}
          />
          <SelectionCard 
            selected={data.food.takeawayRequired}
            onClick={() => setData({...data, food: {...data.food, takeawayRequired: true}})}
            title="Yes"
            description="I need food packets for my return journey."
            icon={Utensils}
          />
        </div>
        
        {data.food.takeawayRequired && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <InputGroup label="Number of Food Packets">
              <StyledInput 
                  type="number"
                  placeholder="0"
                  value={data.food.packetCount || ''} 
                  onChange={e => setData({...data, food: {...data.food, packetCount: parseInt(e.target.value) || 0}})}
                />
            </InputGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Date of Requirement" subLabel={isLockedToCheckout ? "Linked to Check-out Date" : "Select Departure Day"}>
                 {isLockedToCheckout ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center text-gray-700">
                       <Lock className="w-4 h-4 mr-2 text-orange-500" />
                       <span className="font-bold">{formatDisplayDate(parseEventDate(data.accommodation.departureDate))}</span>
                       <span className="text-xs text-gray-400 ml-auto uppercase font-bold tracking-wider">Locked</span>
                    </div>
                 ) : (
                    <DateOptionGroup 
                       name="pickupDate"
                       options={foodDateOptions}
                       selectedDate={data.food.pickupDate}
                       onChange={(d) => setData({...data, food: {...data.food, pickupDate: d}})}
                    />
                 )}
              </InputGroup>
              <InputGroup label="Collection Time" subLabel="Approximate time">
                <StyledInput type="time" value={data.food.pickupTime} onChange={e => setData({...data, food: {...data.food, pickupTime: e.target.value}})} />
              </InputGroup>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => {
    const renderDateLine = (title: string, groupDates: string[]) => {
       const selectedInGroup = groupDates.filter(d => data.attendingDates.includes(d));
       if (selectedInGroup.length === 0) return null;

       const formattedDates = selectedInGroup.map(d => {
         const raw = d.split('(')[0].trim();
         return raw.replace(', 2026', '').replace(' 2026', ''); // e.g. "March 28"
       }).join(', ');

       return (
         <div className="mt-2 text-sm text-gray-700">
           <span className="font-bold text-gray-800">{title}:</span> {formattedDates}
         </div>
       );
    };

    return (
      <div className="step-enter">
        <SectionTitle title="Final Review" subtitle="Please check your details carefully before submitting." />
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Ticket Style */}
          <div className="bg-gradient-to-r from-orange-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{data.primaryParticipant.fullName}</h3>
              <p className="text-sm text-gray-500 font-medium">{data.primaryParticipant.mobile}</p>
            </div>
            <div className="text-right">
               <span className="inline-block px-3 py-1 bg-white text-orange-700 text-xs font-bold rounded-full border border-orange-200 shadow-sm">
                 Total: {data.additionalGuests.length + 1} Person(s)
               </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start space-x-4">
               <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100"><Calendar className="w-5 h-5 text-orange-600" /></div>
               <div className="flex-grow">
                 <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Attending Dates</h4>
                 <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                   {data.attendingDates.length === EVENT_DATES.length ? (
                      <span className="font-bold text-orange-700">All Days (March 28 - April 07)</span>
                   ) : data.attendingDates.length === 0 ? (
                      <span className="text-gray-400 italic">None selected</span>
                   ) : (
                      <div className="space-y-1">
                        {renderDateLine("Pre-Conference", DATE_GROUPS.PRE.dates)}
                        {renderDateLine("Conference", DATE_GROUPS.CONF.dates)}
                        {renderDateLine("Post-Conference", DATE_GROUPS.POST.dates)}
                      </div>
                   )}
                 </div>
               </div>
            </div>

            <div className="flex items-start space-x-4">
               <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100"><Users className="w-5 h-5 text-orange-600" /></div>
               <div>
                 <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Guests</h4>
                 {data.additionalGuests.length > 0 ? (
                   <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                      {data.additionalGuests.map(g => <li key={g.id}>{g.fullName}</li>)}
                   </ul>
                 ) : (
                   <p className="text-sm text-gray-500 mt-1">No additional guests</p>
                 )}
               </div>
            </div>

            <div className="flex items-start space-x-4">
               <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100"><Home className="w-5 h-5 text-orange-600" /></div>
               <div>
                 <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Accommodation</h4>
                 <p className="text-sm text-gray-600 mt-1">
                   {data.accommodation.required 
                     ? `Yes, for ${data.accommodation.memberIds.length} people. (${data.accommodation.arrivalDate} to ${data.accommodation.departureDate})` 
                     : 'Not Required'}
                 </p>
               </div>
            </div>

            <div className="flex items-start space-x-4">
               <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100"><Utensils className="w-5 h-5 text-orange-600" /></div>
               <div>
                 <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Return Food</h4>
                 <p className="text-sm text-gray-600 mt-1">
                   {data.food.takeawayRequired 
                     ? `Collect ${data.food.packetCount} packets on ${data.food.pickupDate}` 
                     : 'Not Required'}
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="text-center py-12 animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
        <PartyPopper className="w-12 h-12 text-orange-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
      <p className="text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
        Thank you for registering for the Sri Ramayana Satram. Your details have been recorded securely.
      </p>
      <div className="flex justify-center space-x-4">
        <button 
          onClick={() => window.location.href = 'https://webolim.github.io/Valmiki-Ramayana-Conference-2026/'}
          className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          Return to Conference Page
        </button>
      </div>
    </div>
  );

  if (!isConfigured) {
    return (
      <Layout>
        <div className="text-center p-8 text-red-600">
          <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
          <p>Please configure SUPABASE_URL and SUPABASE_ANON_KEY in <code>constants.ts</code></p>
        </div>
      </Layout>
    );
  }

  if (isSuccess) {
    return <Layout>{renderSuccess()}</Layout>;
  }

  return (
    <Layout>
      {/* Search Mode Overlay */}
      {isSearchMode && (
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-orange-100/50 border border-orange-50 min-h-[400px]">
          {renderSearch()}
        </div>
      )}

      {/* Main Wizard Flow */}
      {!isSearchMode && (
        <>
          {/* Wizard Progress Bar - Mobile */}
          <div className="md:hidden mb-6 flex items-center justify-between bg-orange-50 border border-orange-200 shadow-md p-4 rounded-xl">
             <div className="flex items-center gap-2">
                <span className="bg-orange-100 p-1.5 rounded-full text-orange-600">
                   {/* Get icon for current step */}
                   {(() => {
                      const CurrentIcon = STEPS.find(s => s.id === step)?.icon || User;
                      return <CurrentIcon className="w-4 h-4" />;
                   })()}
                </span>
                <span className="font-bold text-gray-900">{STEPS.find(s => s.id === step)?.title}</span>
             </div>
             <span className="text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                Step {STEPS.findIndex(s => s.id === step) + 1} of {STEPS.length}
             </span>
          </div>

          {/* Wizard Progress Bar - Desktop */}
          <div className="hidden md:flex mb-16 justify-between relative px-4">
             <div className="absolute top-5 left-4 right-4 h-1 bg-gray-200 -z-0 rounded-full"></div>
             <div 
               className="absolute top-5 left-4 h-1 bg-orange-500 -z-0 rounded-full transition-all duration-500"
               style={{ width: `${(STEPS.findIndex(s => s.id === step) / (STEPS.length - 1)) * 100}%` }}
             ></div>
             
             {STEPS.map((s, idx) => {
                const currentIndex = STEPS.findIndex(st => st.id === step);
                const isCompleted = currentIndex > idx;
                const isCurrent = s.id === step;
                
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center group cursor-default">
                    <div className={`
                       w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-sm bg-white font-bold text-lg
                       ${isCurrent ? 'border-orange-500 text-orange-600 scale-110 ring-4 ring-orange-100' : 
                         isCompleted ? 'border-orange-500 bg-orange-500 text-white' : 
                         'border-gray-200 text-gray-400 bg-gray-50'}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                    </div>
                    <div className={`
                       absolute top-14 text-xs font-bold uppercase tracking-wider whitespace-nowrap px-2 py-1 rounded transition-colors
                       ${isCurrent ? 'text-orange-700 bg-orange-50' : 
                         isCompleted ? 'text-gray-900' : 
                         'text-gray-400'}
                    `}>
                      {s.title}
                    </div>
                  </div>
                )
             })}
          </div>

          {/* Error Message - Fixed Bottom Toast */}
          {error && (
            <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-2xl flex items-start justify-between">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-600" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold block mb-1">Attention Needed</h3>
                    <p className="text-sm font-medium opacity-90">{error}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setError(null)} 
                  className="ml-4 text-red-400 hover:text-red-600 hover:bg-red-100 p-1 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl shadow-orange-100/40 border border-orange-50 min-h-[400px] transition-all">
            {step === 'PRIMARY' && renderPrimary()}
            {step === 'ATTENDANCE' && renderAttendance()}
            {step === 'GUESTS' && renderGuests()}
            {step === 'ACCOMMODATION' && renderAccommodation()}
            {step === 'FOOD' && renderFood()}
            {step === 'REVIEW' && renderReview()}
          </div>

          {/* Navigation Footer */}
          <div className="mt-8 flex justify-between items-center px-2">
             <div>
                {step !== 'PRIMARY' && (
                  <button 
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-white hover:shadow-sm hover:border-gray-300 transition flex items-center"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                  </button>
                )}
             </div>

             <button 
               onClick={step === 'REVIEW' ? handleSubmit : handleNext}
               disabled={loading}
               className={`
                 px-8 py-3 rounded-xl text-white font-bold shadow-lg shadow-orange-500/20 flex items-center transition-all transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0
                 ${loading ? 'bg-orange-400 cursor-wait' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'}
               `}
             >
               {loading ? (
                 <>
                   <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
                 </>
               ) : step === 'REVIEW' ? (
                 <>
                   Submit Registration <CheckCircle2 className="w-5 h-5 ml-2" />
                 </>
               ) : (
                 <>
                   Next Step <ArrowRight className="w-5 h-5 ml-2" />
                 </>
               )}
             </button>
          </div>
        </>
      )}
    </Layout>
  );
}
