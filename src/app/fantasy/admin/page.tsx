'use client';

import { useState, useEffect } from 'react';
import { Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface Driver {
  number: number;
  acronym: string;
  name: string;
  team: string;
  price: number;
  history: number[];
  priceChange: number;
}

interface Constructor {
  id: string;
  name: string;
  price: number;
  history: number[];
  priceChange: number;
}

const ADMIN_KEY = 'pitwall2026';

export default function FantasyAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Editable state
  const [driverPrices, setDriverPrices] = useState<Record<string, string>>({});
  const [constructorPrices, setConstructorPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [driversRes, constructorsRes] = await Promise.all([
        fetch('/api/fantasy/prices'),
        fetch('/api/fantasy/prices?type=constructors'),
      ]);
      
      const driversData = await driversRes.json();
      const constructorsData = await constructorsRes.json();
      
      setDrivers(driversData.data || []);
      setConstructors(constructorsData.data || []);
      
      // Initialize editable prices
      const dPrices: Record<string, string> = {};
      driversData.data?.forEach((d: Driver) => {
        dPrices[d.acronym] = d.price.toFixed(1);
      });
      setDriverPrices(dPrices);
      
      const cPrices: Record<string, string> = {};
      constructorsData.data?.forEach((c: Constructor) => {
        cPrices[c.id] = c.price.toFixed(1);
      });
      setConstructorPrices(cPrices);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) {
      setIsAuthenticated(true);
      setMessage(null);
    } else {
      setMessage({ type: 'error', text: 'Invalid password' });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);

    const driversUpdate = drivers
      .filter(d => driverPrices[d.acronym] !== undefined)
      .map(d => ({
        acronym: d.acronym,
        price: parseFloat(driverPrices[d.acronym]) || d.price,
      }));

    const constructorsUpdate = constructors
      .filter(c => constructorPrices[c.id] !== undefined)
      .map(c => ({
        id: c.id,
        price: parseFloat(constructorPrices[c.id]) || c.price,
      }));

    try {
      const response = await fetch('/api/fantasy/prices/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_KEY}`,
        },
        body: JSON.stringify({
          drivers: driversUpdate,
          constructors: constructorsUpdate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Updated ${result.updated} prices successfully!` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update prices' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-md mx-auto">
          <div className="f1-card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[rgba(232,0,45,0.12)] flex items-center justify-center mx-auto mb-4">
                <Lock className="text-[#E8002D]" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
              <p className="text-sm text-[#7878A0]">
                Enter password to manage fantasy prices
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-[#1C1C2E] text-white placeholder-[#4A4A6A] px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.07)] focus:border-[#E8002D] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-[#E8002D] text-white rounded-xl font-medium hover:bg-[#B80024] transition-colors"
              >
                Access Admin Panel
              </button>
            </form>

            {message && (
              <div className="mt-4 p-3 bg-[rgba(255,51,51,0.1)] border border-[#FF3333] rounded-lg">
                <p className="text-sm text-[#FF3333] flex items-center gap-2">
                  <AlertCircle size={16} />
                  {message.text}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="f1-card">
          <div className="flex items-center justify-center py-12">
            <div className="skeleton w-full h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="text-[#E8002D]" size={24} />
            Price Admin
          </h1>
          <p className="text-sm text-[#7878A0] mt-1">
            Update driver and constructor prices for F1 Fantasy
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#E8002D] text-white rounded-lg font-medium hover:bg-[#B80024] transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-[rgba(0,255,68,0.1)] border border-[#00FF44]' 
            : 'bg-[rgba(255,51,51,0.1)] border border-[#FF3333]'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="text-[#00FF44]" size={20} />
          ) : (
            <AlertCircle className="text-[#FF3333]" size={20} />
          )}
          <p className={message.type === 'success' ? 'text-[#00FF44]' : 'text-[#FF3333]'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Drivers Table */}
      <div className="f1-card mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Drivers ({drivers.length})</h2>
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>DRIVER</th>
                <th>TEAM</th>
                <th className="text-right">CURRENT</th>
                <th className="text-right">NEW PRICE</th>
                <th>HISTORY</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.number}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white w-8">{driver.acronym}</span>
                      <span className="text-[#EEEEF5]">{driver.name}</span>
                    </div>
                  </td>
                  <td className="text-[#7878A0]">{driver.team}</td>
                  <td className="text-right">
                    <span className="font-bold text-white">${driver.price.toFixed(1)}M</span>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={driverPrices[driver.acronym] || ''}
                      onChange={(e) => setDriverPrices({
                        ...driverPrices,
                        [driver.acronym]: e.target.value
                      })}
                      className="w-24 bg-[#1C1C2E] text-white text-right px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] focus:border-[#E8002D] focus:outline-none"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {driver.history.slice(-5).map((h, i) => (
                        <span key={i} className="text-xs text-[#7878A0]">${h.toFixed(1)}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Constructors Table */}
      <div className="f1-card">
        <h2 className="text-lg font-bold text-white mb-4">Constructors ({constructors.length})</h2>
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>CONSTRUCTOR</th>
                <th className="text-right">CURRENT</th>
                <th className="text-right">NEW PRICE</th>
                <th>HISTORY</th>
              </tr>
            </thead>
            <tbody>
              {constructors.map((constructor) => (
                <tr key={constructor.id}>
                  <td>
                    <span className="font-bold text-white">{constructor.name}</span>
                  </td>
                  <td className="text-right">
                    <span className="font-bold text-white">${constructor.price.toFixed(1)}M</span>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={constructorPrices[constructor.id] || ''}
                      onChange={(e) => setConstructorPrices({
                        ...constructorPrices,
                        [constructor.id]: e.target.value
                      })}
                      className="w-24 bg-[#1C1C2E] text-white text-right px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] focus:border-[#E8002D] focus:outline-none"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {constructor.history.slice(-5).map((h, i) => (
                        <span key={i} className="text-xs text-[#7878A0]">${h.toFixed(1)}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
