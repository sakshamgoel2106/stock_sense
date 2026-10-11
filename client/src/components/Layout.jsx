import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, MapPin, BarChart3, LayoutDashboard, 
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Sliders, 
  LogOut, UserCircle, BookOpen, Menu, X,
  Clock, TrendingUp, DollarSign, Bookmark, CheckSquare, ClipboardCheck,
  Search, Bell, Settings, Brain, Sparkles, Users, Building2, Receipt,
  ChevronDown, Check, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import toast from 'react-hot-toast';
import AICopilotWidget from './AICopilotWidget';

const Layout = () => {
  const { user, company, role, logout } = useAuth();
  const { selectedCountry, changeCountry, countryMeta, availableCountries } = useCountry();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // States for new header features
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [notifications, setNotifications] = useState([]); // Empty for now until a real backend notification system is built
  
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const countryRef = useRef(null);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (countryRef.current && !countryRef.current.contains(event.target)) setIsCountryOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;
  const displayRoleLabel = isCompanyAdmin ? 'Company Admin' : (isManager ? 'Manager' : 'Worker');

  const navLinks = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/intelligence", icon: <Brain size={20} className="text-indigo-600" />, label: "AI Intelligence", badge: "AI" },
    ...(isManager ? [{ to: "/team", icon: <Users size={20} />, label: "Team Management" }] : []),
    { to: "/products", icon: <Package size={20} />, label: "Products" },
    { to: "/warehouses", icon: <MapPin size={20} />, label: "Warehouses" },
    { to: "/stock-overview", icon: <BarChart3 size={20} />, label: "Stock Overview" },
    ...(isManager ? [{ to: "/ledger", icon: <BookOpen size={20} />, label: "Stock Ledger" }] : []),
  ];

  const operationLinks = [
    { to: "/receipts", icon: <ArrowDownToLine size={20} />, label: "Receipts" },
    { to: "/deliveries", icon: <ArrowUpFromLine size={20} />, label: "Deliveries" },
    { to: "/invoices", icon: <Receipt size={20} className="text-emerald-600" />, label: "Billing & Invoices" },
    { to: "/transfers", icon: <ArrowRightLeft size={20} />, label: "Transfers" },
    { to: "/adjustments", icon: <Sliders size={20} />, label: "Adjustments" },
  ];

  const advancedLinks = [
    ...(isManager ? [
      { to: "/aging", icon: <Clock size={20} />, label: "Stock Aging" },
      { to: "/forecasting", icon: <TrendingUp size={20} />, label: "Forecasting" },
      { to: "/valuation", icon: <DollarSign size={20} />, label: "Valuation" },
      { to: "/approvals", icon: <CheckSquare size={20} />, label: "Transfer Approvals" },
    ] : []),
    { to: "/reservations", icon: <Bookmark size={20} />, label: "Reservations" },
    { to: "/audits", icon: <ClipboardCheck size={20} />, label: "Smart Audits" },
    { to: "/settings", icon: <Settings size={20} />, label: "Company Settings" },
  ];

  const NavItem = ({ to, icon, label, badge }) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link 
        to={to} 
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-indigo-50 text-indigo-700 font-medium' 
            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon} {label}
        </div>
        {badge && (
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm sm:text-base">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 bg-white border-r flex flex-col z-30 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <Package />
            StockSense
          </Link>
          <button className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Operations</p>
          </div>
          
          {operationLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Advanced</p>
          </div>
          
          {advancedLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}
        </nav>

        {/* Removed redundant sidebar logout, moved to Profile dropdown */}
        <div className="p-4 border-t bg-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-indigo-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 inline-block px-2 py-0.5 rounded-full mt-0.5">{displayRoleLabel}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50/50">
        {/* Persistent Premium Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 sm:px-6 shadow-sm">
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-600 mr-2 p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
          
          <h1 className="truncate text-lg font-semibold text-gray-900 hidden md:block">
            Welcome back, <span className="text-indigo-600">{user?.name?.split(" ")[0] || "User"}</span> 👋
          </h1>

          {company && (
            <div className="hidden lg:flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
              <Building2 size={13} className="text-indigo-600" />
              <span>{company.name}</span>
              <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-mono ml-1">{company.code}</span>
            </div>
          )}
          
          <div className="md:hidden flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <Package size={20} />
            StockSense
          </div>
          
          <div className="ml-auto flex items-center gap-2 sm:gap-4 relative">
            
            {/* Global MNC Operating Country Selector */}
            <div className="relative" ref={countryRef}>
              <button
                onClick={() => setIsCountryOpen(!isCountryOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold transition-all shadow-xs hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                title="Switch Operating Country / MNC Jurisdiction"
              >
                <span className="text-base sm:text-lg leading-none">{countryMeta.flag}</span>
                <span className="font-bold hidden sm:inline">{countryMeta.code === 'ALL' ? 'Global' : countryMeta.name}</span>
                <span className="font-bold sm:hidden">{countryMeta.code}</span>
                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold hidden md:inline">
                  {countryMeta.currencySymbol} {countryMeta.currency}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCountryOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCountryOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">MNC Operating Jurisdiction</p>
                    <p className="text-xs text-gray-500">Filter panel data to a specific country</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {availableCountries.map((c) => {
                      const isSelected = selectedCountry === c.code;
                      return (
                        <button
                          key={c.code}
                          onClick={() => {
                            changeCountry(c.code);
                            setIsCountryOpen(false);
                            toast.success(c.code === 'ALL' ? 'Switched to Global Enterprise view' : `Switched to ${c.name} jurisdiction`);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs sm:text-sm hover:bg-indigo-50/70 transition-colors ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg leading-none">{c.flag}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-900">{c.name}</span>
                                {c.code === 'ALL' && <span className="text-[9px] bg-slate-100 text-slate-700 px-1 rounded font-bold">ALL</span>}
                              </div>
                              {c.code !== 'ALL' && (
                                <span className="text-[11px] text-gray-400 block font-mono">
                                  {c.currency} ({c.currencySymbol}) • {c.taxSystem}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Global Search */}
            <div className="relative flex items-center" ref={searchRef}>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${isSearchOpen ? 'w-48 sm:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
                <form onSubmit={handleSearch} className="w-full">
                  <input
                    type="text"
                    autoFocus={isSearchOpen}
                    placeholder="Search anything..."
                    className="w-full pl-3 pr-8 py-1.5 text-sm bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </form>
              </div>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-full transition-colors relative ${isNotifOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
              
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{notifications.length} New</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        You have no new notifications.
                      </div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div key={idx} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b transition-colors">
                          <p className="text-sm text-gray-800 font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t text-center">
                      <button 
                        onClick={() => { setNotifications([]); setIsNotifOpen(false); }} 
                        className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`ml-1 h-9 w-9 rounded-full bg-indigo-100 border-2 transition-all flex items-center justify-center overflow-hidden hover:shadow-md ${isProfileOpen ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-indigo-200 hover:border-indigo-300'}`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-indigo-700">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setIsProfileOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <UserCircle size={16} /> My Profile
                    </button>
                    <button onClick={() => { setIsProfileOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings size={16} /> Company Settings
                    </button>
                  </div>
                  <div className="py-1 border-t border-gray-50">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Global Floating AI Copilot Chatbot */}
        <AICopilotWidget />
      </div>
    </div>
  );
};

export default Layout;
