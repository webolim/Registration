import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { api } from './services/api';
import { RegistrationData, StepId } from './types';
import { EVENT_DATES, SUPABASE_URL } from './constants';
import { v4 as uuidv4 } from 'uuid';
import { 
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, 
  User, Calendar, Users, Home, Utensils, FileText, 
  Plus, Trash2, MapPin, Phone, AlertCircle, X, Edit3, PartyPopper
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
  { id: 'PRIMARY', title: 'Personal', icon: User },
  { id: 'ATTENDANCE', title: 'Dates', icon: Calendar },
  { id: 'GUESTS', title: 'Guests', icon: Users },
  { id: 'ACCOMMODATION', title: 'Stay', icon: Home },
  { id: 'FOOD', title: 'Food', icon: Utensils },
  { id: 'REVIEW', title: 'Review', icon: FileText },
];

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

const SectionTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="mb-8 border-b border-gray-100 pb-4">
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

    // 3. Accommodation Validation
    if (step === 'ACCOMMODATION' && data.accommodation.required) {
      if (!data.accommodation.arrivalDate || !data.accommodation.departureDate) {
        setError("Please select both check-in and check-out dates.");
        return;
      }

      // Parse selected dates
      const attendingDates = data.attendingDates.map(parseEventDate).sort((a, b) => a.getTime() - b.getTime());
      if (attendingDates.length > 0) {
        const firstEventDate = attendingDates[0];
        const lastEventDate = attendingDates[attendingDates.length - 1];
        
        const arrivalDate = new Date(data.accommodation.arrivalDate);
        const departureDate = new Date(data.accommodation.departureDate);

        // Reset time components for accurate date-only comparison
        firstEventDate.setHours(0,0,0,0);
        lastEventDate.setHours(0,0,0,0);
        arrivalDate.setHours(0,0,0,0);
        departureDate.setHours(0,0,0,0);

        if (arrivalDate > departureDate) {
          setError("Check-out date cannot be before check-in date.");
          return;
        }

        // Logic: You shouldn't arrive after the event starts (or at least your first day) 
        // and shouldn't leave before your last day.
        if (arrivalDate > firstEventDate) {
          setError(`Your check-in date (${data.accommodation.arrivalDate}) is after your first attending date. Please arrive on or before ${formatDateForInput(firstEventDate)}.`);
          return;
        }

        if (departureDate < lastEventDate) {
          setError(`Your check-out date (${data.accommodation.departureDate}) is before your last attending date. Please depart on or after ${formatDateForInput(lastEventDate)}.`);
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

  const getAllowedDateRange = () => {
    if (data.attendingDates.length === 0) return { min: undefined, max: undefined };

    const sortedDates = data.attendingDates
      .map(parseEventDate)
      .sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length === 0) return { min: undefined, max: undefined };

    const firstDate = new Date(sortedDates[0]);
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);

    // Minus 1 day from first
    const minDate = new Date(firstDate);
    minDate.setDate(minDate.getDate() - 1);

    // Plus 1 day to last
    const maxDate = new Date(lastDate);
    maxDate.setDate(maxDate.getDate() + 1);

    return {
      min: formatDateForInput(minDate),
      max: formatDateForInput(maxDate)
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
         <div className="bg-white border-l-4 border-orange-500 shadow-md rounded-r-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-lg">
           <div className="flex items-start">
             <div className="bg-orange-100 p-2 rounded-full mr-4 text-orange-600 hidden sm:block">
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
            <option value="Other">Other</option>
          </StyledSelect>
        </InputGroup>

        <div className="md:col-span-2">
          <InputGroup label="City / Town" required>
             <div className="relative">
              <StyledInput
                value={data.primaryParticipant.city}
                onChange={e => setData({...data, primaryParticipant: {...data.primaryParticipant, city: e.target.value}})}
                placeholder="Current city of residence"
              />
               <MapPin className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
             </div>
          </InputGroup>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="step-enter">
      <SectionTitle title="Event Attendance" subtitle="Select all the dates you plan to be present at the Satram." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EVENT_DATES.map(date => {
          const isSelected = data.attendingDates.includes(date);
          const parts = date.split('(');
          const dateStr = parts[0].trim();
          const extra = parts[1] ? `(${parts[1]}` : '';

          return (
            <div 
              key={date}
              onClick={() => {
                if (isSelected) {
                  setData({...data, attendingDates: data.attendingDates.filter(d => d !== date)});
                } else {
                  setData({...data, attendingDates: [...data.attendingDates, date]});
                }
              }}
              className={`
                cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                ${isSelected 
                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50'}
              `}
            >
              <div>
                <span className={`block font-bold ${isSelected ? 'text-orange-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {dateStr}
                </span>
                {extra && <span className="text-xs font-semibold text-orange-600 block mt-1">{extra.replace(')', '')}</span>}
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 group-hover:border-orange-300'}`}>
                 {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4 italic text-center">Select multiple dates if applicable.</p>
    </div>
  );

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
    const { min, max } = getAllowedDateRange();

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
              <div className="flex flex-wrap gap-2">
                {[data.primaryParticipant, ...data.additionalGuests].map(p => {
                  const isChecked = data.accommodation.memberIds.includes(p.id);
                  return (
                    <label 
                      key={p.id} 
                      className={`
                        cursor-pointer select-none px-4 py-2 rounded-full border text-sm font-medium transition
                        ${isChecked 
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}
                      `}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isChecked}
                        onChange={e => {
                          const ids = data.accommodation.memberIds;
                          const newIds = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                          setData({...data, accommodation: {...data.accommodation, memberIds: newIds}});
                        }}
                      />
                      {p.fullName || 'Unnamed Guest'}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Check-in Date & Time" subLabel="Must be on or before your first event day">
                  <div className="flex space-x-2">
                    <StyledInput type="date" min={min} max={max} value={data.accommodation.arrivalDate} onChange={e => setData({...data, accommodation: {...data.accommodation, arrivalDate: e.target.value}})} />
                    <StyledInput type="time" value={data.accommodation.arrivalTime} onChange={e => setData({...data, accommodation: {...data.accommodation, arrivalTime: e.target.value}})} />
                  </div>
              </InputGroup>
              <InputGroup label="Check-out Date & Time" subLabel="Must be on or after your last event day">
                  <div className="flex space-x-2">
                    <StyledInput type="date" min={min} max={max} value={data.accommodation.departureDate} onChange={e => setData({...data, accommodation: {...data.accommodation, departureDate: e.target.value}})} />
                    <StyledInput type="time" value={data.accommodation.departureTime} onChange={e => setData({...data, accommodation: {...data.accommodation, departureTime: e.target.value}})} />
                  </div>
              </InputGroup>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFood = () => {
    const { min, max } = getAllowedDateRange();

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
              <InputGroup label="Collection Date" subLabel="Date you will collect food at venue">
                <StyledInput type="date" min={min} max={max} value={data.food.pickupDate} onChange={e => setData({...data, food: {...data.food, pickupDate: e.target.value}})} />
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

  const renderReview = () => (
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
             <div>
               <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Attending Dates</h4>
               <p className="text-sm text-gray-600 mt-1 leading-relaxed">{data.attendingDates.join(', ') || 'None selected'}</p>
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

  const renderSuccess = () => (
    <div className="text-center py-12 animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
        <PartyPopper className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
      <p className="text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
        Thank you for registering for the Sri Ramayana Satram. Your details have been recorded securely.
      </p>
      <div className="flex justify-center space-x-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          Return to Home
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
          <div className="md:hidden mb-6 flex items-center justify-between bg-white border border-gray-100 shadow-sm p-4 rounded-xl">
             <span className="font-bold text-gray-800">Step {STEPS.findIndex(s => s.id === step) + 1} of {STEPS.length}</span>
             <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                {Math.round(((STEPS.findIndex(s => s.id === step) + 1) / STEPS.length) * 100)}%
             </span>
          </div>

          {/* Wizard Progress Bar - Desktop */}
          <div className="hidden md:flex mb-12 justify-between relative px-4">
             <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-100 -z-0 rounded-full"></div>
             <div 
               className="absolute top-1/2 left-4 h-0.5 bg-orange-500 -z-0 rounded-full transition-all duration-500"
               style={{ width: `${(STEPS.findIndex(s => s.id === step) / (STEPS.length - 1)) * 100}%` }}
             ></div>
             
             {STEPS.map((s, idx) => {
                const currentIndex = STEPS.findIndex(st => st.id === step);
                const isCompleted = currentIndex > idx;
                const isCurrent = s.id === step;
                
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center group cursor-default">
                    <div className={`
                       w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-white font-bold text-sm
                       ${isCurrent ? 'border-orange-500 text-orange-600 scale-125 ring-4 ring-orange-50' : 
                         isCompleted ? 'border-orange-500 bg-orange-500 text-white' : 
                         'border-gray-200 text-gray-300'}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                  </div>
                )
             })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
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