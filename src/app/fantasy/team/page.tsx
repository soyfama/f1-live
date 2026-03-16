'use client';

import { useState, useEffect } from 'react';
import { Users, Wrench, Plus, Minus, Trash2, Save, RotateCcw } from 'lucide-react';

interface Driver {
  number: number;
  acronym: string;
  name: string;
  team: string;
  price: number;
}

interface Constructor {
  id: string;
  name: string;
  price: number;
}

const BUDGET = 100;
const MAX_DRIVERS = 5;
const MAX_CONSTRUCTORS = 2;

export default function FantasyTeamPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([]);
  const [selectedConstructors, setSelectedConstructors] = useState<Constructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const totalSpent = selectedDrivers.reduce((sum, d) => sum + d.price, 0) + 
                     selectedConstructors.reduce((sum, c) => sum + c.price, 0);
  const remaining = BUDGET - totalSpent;

  const addDriver = (driver: Driver) => {
    if (selectedDrivers.length >= MAX_DRIVERS) return;
    if (selectedDrivers.find(d => d.number === driver.number)) return;
    if (totalSpent + driver.price > BUDGET) return;
    setSelectedDrivers([...selectedDrivers, driver]);
  };

  const removeDriver = (driver: Driver) => {
    setSelectedDrivers(selectedDrivers.filter(d => d.number !== driver.number));
  };

  const addConstructor = (constructor: Constructor) => {
    if (selectedConstructors.length >= MAX_CONSTRUCTORS) return;
    if (selectedConstructors.find(c => c.id === constructor.id)) return;
    if (totalSpent + constructor.price > BUDGET) return;
    setSelectedConstructors([...selectedConstructors, constructor]);
  };

  const removeConstructor = (constructor: Constructor) => {
    setSelectedConstructors(selectedConstructors.filter(c => c.id !== constructor.id));
  };

  const resetTeam = () => {
    setSelectedDrivers([]);
    setSelectedConstructors([]);
  };

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
            <Users className="text-[#E8002D]" size={24} />
            Team Builder
          </h1>
          <p className="text-sm text-[#7878A0] mt-1">
            Build your fantasy team: 5 drivers + 2 constructors within the $100M budget
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[#7878A0]">Budget</div>
            <div className={`text-xl font-bold ${remaining < 0 ? 'text-[#FF3333]' : 'text-white'}`}>
              ${remaining.toFixed(1)}M
            </div>
          </div>
          <div className="w-px h-10 bg-[rgba(255,255,255,0.07)]" />
          <div className="text-right">
            <div className="text-xs text-[#7878A0]">Spent</div>
            <div className="text-xl font-bold text-white">${totalSpent.toFixed(1)}M</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Team */}
        <div className="lg:col-span-1 space-y-4">
          {/* Selected Drivers */}
          <div className="f1-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Drivers ({selectedDrivers.length}/{MAX_DRIVERS})</h3>
            </div>
            {selectedDrivers.length === 0 ? (
              <p className="text-sm text-[#7878A0]">No drivers selected</p>
            ) : (
              <div className="space-y-2">
                {selectedDrivers.map(driver => (
                  <div key={driver.number} className="flex items-center justify-between p-2 bg-[#1C1C2E] rounded-lg">
                    <div>
                      <div className="font-bold text-white">{driver.acronym}</div>
                      <div className="text-xs text-[#7878A0]">{driver.team}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">${driver.price.toFixed(1)}M</span>
                      <button 
                        onClick={() => removeDriver(driver)}
                        className="p-1 text-[#FF3333] hover:bg-[rgba(255,51,51,0.1)] rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Constructors */}
          <div className="f1-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Constructors ({selectedConstructors.length}/{MAX_CONSTRUCTORS})</h3>
            </div>
            {selectedConstructors.length === 0 ? (
              <p className="text-sm text-[#7878A0]">No constructors selected</p>
            ) : (
              <div className="space-y-2">
                {selectedConstructors.map(constructor => (
                  <div key={constructor.id} className="flex items-center justify-between p-2 bg-[#1C1C2E] rounded-lg">
                    <div className="font-bold text-white">{constructor.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">${constructor.price.toFixed(1)}M</span>
                      <button 
                        onClick={() => removeConstructor(constructor)}
                        className="p-1 text-[#FF3333] hover:bg-[rgba(255,51,51,0.1)] rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={resetTeam}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1C1C2E] text-[#7878A0] rounded-lg hover:bg-[#2C2C3E] hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            Reset Team
          </button>
        </div>

        {/* Available Players */}
        <div className="lg:col-span-2 space-y-6">
          {/* Available Drivers */}
          <div className="f1-card">
            <h3 className="font-bold text-white mb-4">Available Drivers</h3>
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>DRIVER</th>
                    <th>TEAM</th>
                    <th className="text-right">PRICE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(driver => {
                    const isSelected = selectedDrivers.find(d => d.number === driver.number);
                    const canAfford = totalSpent + driver.price <= BUDGET;
                    const canAdd = selectedDrivers.length < MAX_DRIVERS;
                    return (
                      <tr key={driver.number} className={isSelected ? 'opacity-50' : ''}>
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
                          {isSelected ? (
                            <span className="text-xs text-[#00FF44]">Selected</span>
                          ) : (
                            <button
                              onClick={() => addDriver(driver)}
                              disabled={!canAfford || !canAdd}
                              className="p-1.5 bg-[#E8002D] text-white rounded hover:bg-[#B80024] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Available Constructors */}
          <div className="f1-card">
            <h3 className="font-bold text-white mb-4">Available Constructors</h3>
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>CONSTRUCTOR</th>
                    <th className="text-right">PRICE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {constructors.map(constructor => {
                    const isSelected = selectedConstructors.find(c => c.id === constructor.id);
                    const canAfford = totalSpent + constructor.price <= BUDGET;
                    const canAdd = selectedConstructors.length < MAX_CONSTRUCTORS;
                    return (
                      <tr key={constructor.id} className={isSelected ? 'opacity-50' : ''}>
                        <td>
                          <span className="font-bold text-white">{constructor.name}</span>
                        </td>
                        <td className="text-right">
                          <span className="font-bold text-white">${constructor.price.toFixed(1)}M</span>
                        </td>
                        <td className="text-right">
                          {isSelected ? (
                            <span className="text-xs text-[#00FF44]">Selected</span>
                          ) : (
                            <button
                              onClick={() => addConstructor(constructor)}
                              disabled={!canAfford || !canAdd}
                              className="p-1.5 bg-[#E8002D] text-white rounded hover:bg-[#B80024] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
