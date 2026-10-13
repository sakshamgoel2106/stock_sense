import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, MapPin, BarChart3, LayoutDashboard, 
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Sliders, 
  LogOut, UserCircle, BookOpen, Menu, X,
  Clock, TrendingUp, DollarSign, Bookmark, CheckSquare, ClipboardCheck,
  Search, Bell, Settings, Brain, Sparkles, Users, Building2, Receipt,
  ChevronRight, Command, Plus, ShieldCheck, Zap, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import AICopilotWidget from './AICopilotWidget';

const Layout = () => {
  const { user, company, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Header state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Real-world dynamic supply chain notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Low Stock Alert: Mumbai Hub",
      message: "EV Battery Pack 48V (SKU: BAT-EV-48V) dropped below safety threshold (8 units left).",
      time: "10m ago",
      type: "warning",
      unread: true
    },
    {
      id: 2,
      title: "Transfer Pending Approval",
      message: "Delhi Hub requested 150 units of Solar Inverters from Bhiwandi Hub.",
      time: "35m ago",
      type: "info",
      unread: true
    },
    {
      id: 3,
      title: "Inbound Receipt Validated",
      message: "PO #RCP-8842 with 200 Industrial Sensors received into Bengaluru Facility.",
      time: "2h ago",
      type: "success",
      unread: false
    }
  ]);
  
  const searchInputRef = useRef(null);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickAddRef = useRef(null);

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
        setIsProfileOpen(false);
        setIsQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (quickAddRef.current && !quickAddRef.current.contains(event.target)) setIsQuickAddOpen(false);
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

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;
  const displayRoleLabel = isCompanyAdmin ? 'Company Admin' : (isManager ? 'Manager' : 'Worker');

  const navLinks = [
    { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/intelligence", icon: <Brain size={18} className="text-indigo-600" />, label: "AI Intelligence", badge: "AI" },
    ...(isManager ? [{ to: "/team", icon: <Users size={18} />, label: "Team & Access" }] : []),
    { to: "/products", icon: <Package size={18} />, label: "Products Master" },
    { to: "/warehouses", icon: <MapPin size={18} />, label: "Warehouses" },
    { to: "/stock-overview", icon: <BarChart3 size={18} />, label: "Stock Matrix" },
    ...(isManager ? [{ to: "/ledger", icon: <BookOpen size={18} />, label: "Stock Ledger" }] : []),
  ];

  const operationLinks = [
    { to: "/receipts", icon: <ArrowDownToLine size={18} />, label: "Receipts" },
    { to: "/deliveries", icon: <ArrowUpFromLine size={18} />, label: "Deliveries" },
    { to: "/invoices", icon: <Receipt size={18} className="text-emerald-600" />, label: "Billing & Invoices", badge: "GST" },
    { to: "/transfers", icon: <ArrowRightLeft size={18} />, label: "Transfers" },
    { to: "/adjustments", icon: <Sliders size={18} />, label: "Adjustments" },
  ];

  const advancedLinks = [
    ...(isManager ? [
      { to: "/aging", icon: <Clock size={18} />, label: "Stock Aging" },
      { to: "/forecasting", icon: <TrendingUp size={18} />, label: "Forecasting" },
      { to: "/valuation", icon: <DollarSign size={18} />, label: "Valuation" },
      { to: "/approvals", icon: <CheckSquare size={18} />, label: "Transfer Approvals" },
    ] : []),
    { to: "/reservations", icon: <Bookmark size={18} />, label: "Reservations" },
    { to: "/audits", icon: <ClipboardCheck size={18} />, label: "Smart Audits" },
    { to: "/settings", icon: <Settings size={18} />, label: "Company Settings" },
  ];

  // Derive current page title for breadcrumb
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Executive Dashboard';
    if (path.startsWith('/intelligence')) return 'AI Inventory Intelligence';
    if (path.startsWith('/team')) return 'Team & Access Control';
    if (path.startsWith('/products')) return 'Product Master Catalog';
    if (path.startsWith('/warehouses')) return 'Warehouses & Facilities';
    if (path.startsWith('/stock-overview')) return 'Multi-Hub Inventory Matrix';
    if (path.startsWith('/ledger')) return 'Stock Ledger & Audit Trail';
    if (path.startsWith('/receipts')) return 'Inbound Goods Receipts';
    if (path.startsWith('/deliveries')) return 'Outbound Deliveries';
    if (path.startsWith('/invoices')) return 'GST Billing & Invoices';
    if (path.startsWith('/transfers')) return 'Inter-Warehouse Transfers';
    if (path.startsWith('/adjustments')) return 'Stock Adjustments';
    if (path.startsWith('/aging')) return 'Stock Aging Analysis';
    if (path.startsWith('/forecasting')) return 'Demand Forecasting';
    if (path.startsWith('/valuation')) return 'FIFO Inventory Valuation';
    if (path.startsWith('/reservations')) return 'Stock Reservations (ATP)';
    if (path.startsWith('/approvals')) return 'Transfer Approvals';
    if (path.startsWith('/audits')) return 'Smart Stock Audits';
    if (path.startsWith('/profile')) return 'My Profile';
    if (path.startsWith('/settings')) return 'Enterprise Settings';
    return 'StockSense Command Center';
  };

  const NavItem = ({ to, icon, label, badge }) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link 
        to={to} 
        onClick={() => setMobileMenuOpen(false)}
        className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
          isActive 
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold' 
            : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`transition-transform duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 group-hover:scale-110'}`}>
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
            isActive 
              ? 'bg-white/20 text-white' 
              : badge === 'AI' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-emerald-100 text-emerald-700'
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 w-64 lg:w-70 bg-white border-r border-slate-200/80 flex flex-col z-40 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-white">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
              <Package size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">StockSense</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Enterprise Supply Chain</p>
            </div>
          </Link>
          <button 
            className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-1 pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Core Network</span>
          </div>
          {navLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}

          <div className="pt-5 pb-1 px-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Operations & Logistics</span>
          </div>
          {operationLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}

          <div className="pt-5 pb-1 px-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Analytics & Governance</span>
          </div>
          {advancedLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}
        </nav>

        {/* User Mini Bar in Sidebar */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shadow-sm overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md truncate max-w-[110px]">
                  {displayRoleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="md:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb / Screen Title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>StockSense</span>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight">
                {getCurrentPageTitle()}
              </h2>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Company Pill */}
            {company && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                <Building2 size={13} className="text-indigo-600" />
                <span className="truncate max-w-[120px]">{company.name}</span>
                <span className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono ml-0.5">
                  {company.code}
                </span>
              </div>
            )}

            {/* Quick Action Button */}
            {isManager && (
              <div className="relative" ref={quickAddRef}>
                <button
                  onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                  className="hidden sm:flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs"
                >
                  <Plus size={14} className="text-indigo-600" />
                  <span>Quick Action</span>
                </button>

                {isQuickAddOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Create Operation
                    </div>
                    <Link
                      to="/receipts/new"
                      onClick={() => setIsQuickAddOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <ArrowDownToLine size={15} className="text-indigo-600" /> Inbound Receipt
                    </Link>
                    <Link
                      to="/deliveries/new"
                      onClick={() => setIsQuickAddOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <ArrowUpFromLine size={15} className="text-blue-600" /> Customer Delivery
                    </Link>
                    <Link
                      to="/transfers/new"
                      onClick={() => setIsQuickAddOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <ArrowRightLeft size={15} className="text-purple-600" /> Hub Transfer
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <Link
                      to="/products/new"
                      onClick={() => setIsQuickAddOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <Package size={15} className="text-slate-600" /> Add New SKU
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Global Search Bar with Keyboard Hint */}
            <div className="relative flex items-center" ref={searchRef}>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
                isSearchOpen ? 'w-56 sm:w-72 opacity-100 mr-1.5' : 'w-0 opacity-0'
              }`}>
                <form onSubmit={handleSearch} className="w-full relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search SKU, warehouse, orders..."
                    className="w-full pl-3.5 pr-8 py-1.5 text-xs bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </form>
              </div>
              <button 
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  isSearchOpen ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title="Search (Ctrl + K)"
              >
                <Search size={18} />
                <span className="hidden lg:inline text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded-md">
                  ⌘K
                </span>
              </button>
            </div>

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-xl transition-colors relative ${
                  isNotifOpen ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>
              
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900">Telemetry Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded-full">
                          {unreadCount} Unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead} 
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`px-4 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          notif.unread ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 leading-tight">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-snug">{notif.message}</p>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-center">
                    <Link 
                      to="/intelligence" 
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      <Brain size={13} /> View AI Supply Chain Forecasts
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm transition-all hover:ring-2 hover:ring-indigo-300 ${
                  isProfileOpen ? 'ring-2 ring-indigo-400' : ''
                }`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {displayRoleLabel}
                    </div>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/profile'); }} 
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCircle size={15} className="text-slate-500" /> Account Settings
                    </button>
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/settings'); }} 
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={15} className="text-slate-500" /> Company Policy
                    </button>
                    {isManager && (
                      <button 
                        onClick={() => { setIsProfileOpen(false); navigate('/team'); }} 
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Users size={15} className="text-slate-500" /> Manage Team
                      </button>
                    )}
                  </div>
                  <div className="py-1 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>

        {/* Global Floating AI Copilot Chatbot */}
        <AICopilotWidget />
      </div>
    </div>
  );
};

export default Layout;
