import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, FileDown, FileUp, Menu, X, MessageSquare } from 'lucide-react';
import Dashboard from './screens/Dashboard';
import Guests from './screens/Guests';
import Bookings from './screens/Bookings';
import ImportData from './screens/ImportData';
import ExportData from './screens/ExportData';
import Communications from './screens/Communications';
import { seedDummyData } from './db';

function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    seedDummyData().catch(console.error);
  }, []);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'Guests', id: 'guests', icon: Users },
    { name: 'Bookings', id: 'bookings', icon: CalendarDays },
    { name: 'Communications', id: 'communications', icon: MessageSquare },
    { name: 'Import Excel', id: 'import', icon: FileUp },
    { name: 'Export Backup', id: 'export', icon: FileDown },
  ];

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard navigate={setCurrentScreen} />;
      case 'guests': return <Guests />;
      case 'bookings': return <Bookings />;
      case 'communications': return <Communications />;
      case 'import': return <ImportData />;
      case 'export': return <ExportData />;
      default: return <Dashboard navigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 bg-slate-950">
          <span className="text-lg font-bold truncate">Lakeside CRM</span>
          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 leading-tight">Data stored locally on this device.</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm">
          <span className="text-lg font-bold text-slate-900">Lakeside CRM</span>
          <button className="text-gray-500 hover:text-gray-900" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}

export default App;
