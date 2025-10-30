import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Search, Code, User, Download, Star, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from './SafariOptimizedImage';
import { searchApps, BitcoinApp } from '@/lib/appsUtils';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserProfile {
  address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  avatar_cid?: string;
  tagline?: string;
}

type TabType = 'apps' | 'developers' | 'users';

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredApps, setFilteredApps] = useState<BitcoinApp[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [developers, setDevelopers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'apps' as TabType, label: 'Apps', icon: Code },
    { id: 'developers' as TabType, label: 'Developers', icon: User },
    { id: 'users' as TabType, label: 'Users', icon: User },
  ];

  // Search apps function using utility
  const handleSearchApps = useCallback((query: string) => {
    const results = searchApps(query, 20);
    setFilteredApps(results);
  }, []);

  // Search users function
  const searchUsers = useCallback(async (query: string) => {
    try {
      setLoading(true);
      let queryBuilder = supabase
        .from('profiles')
        .select('address, username, display_name, avatar_url, avatar_cid, tagline')
        .eq('profile_public', true)
        .order('username', { ascending: true });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(`username.ilike.%${query}%,display_name.ilike.%${query}%,tagline.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search developers function (same as users for now)
  const searchDevelopers = useCallback(async (query: string) => {
    try {
      setLoading(true);
      let queryBuilder = supabase
        .from('profiles')
        .select('address, username, display_name, avatar_url, avatar_cid, tagline')
        .eq('profile_public', true)
        .order('username', { ascending: true });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(`username.ilike.%${query}%,display_name.ilike.%${query}%,tagline.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);
      
      if (error) throw error;
      
      setDevelopers(data || []);
    } catch (err) {
      console.error('Error fetching developers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    switch (activeTab) {
      case 'apps':
        searchApps(query);
        break;
      case 'developers':
        searchDevelopers(query);
        break;
      case 'users':
        searchUsers(query);
        break;
    }
  };

  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    
    switch (tabId) {
      case 'apps':
        searchApps(searchQuery);
        break;
      case 'developers':
        searchDevelopers(searchQuery);
        break;
      case 'users':
        searchUsers(searchQuery);
        break;
    }
  };

  // Initialize data when modal opens
  useEffect(() => {
    if (open) {
      handleSearchApps(''); // Load initial apps
    }
  }, [open, handleSearchApps]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleEsc);
      window.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/80 backdrop-blur-md pt-20">
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 bg-black/95 backdrop-blur-xl border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <Search className="text-gray-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search Bitcoin apps, developers, or users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent text-white text-lg placeholder-gray-400 outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-800/50 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'bg-gray-800/80 text-white'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-black/20 backdrop-blur-sm">
          {loading && (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          )}
          
          {!loading && (
            <>
              {/* Apps Tab */}
              {activeTab === 'apps' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Bitcoin Apps ({filteredApps.length})
                  </h3>
                  <div className="space-y-1">
                    {filteredApps.map((app) => (
                      <a
                        key={app.id}
                        href={app.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded flex-shrink-0 flex items-center justify-center">
                          <Code size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-white font-medium text-sm truncate">{app.name}</div>
                            {app.verified && (
                              <Shield size={12} className="text-blue-400" />
                            )}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {app.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Download size={10} />
                              {app.downloads}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Star size={10} className="fill-yellow-400 text-yellow-400" />
                              {app.rating}
                            </div>
                            <div className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">
                              {app.category}
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                    {filteredApps.length === 0 && (
                      <div className="text-gray-400 text-center py-8">
                        {searchQuery ? 'No apps found matching your search' : 'No apps available'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Developers Tab */}
              {activeTab === 'developers' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Developers ({developers.length})
                  </h3>
                  <div className="space-y-1">
                    {developers.map((dev) => (
                      <Link
                        key={dev.address}
                        href={`/${dev.address}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                          {dev.avatar_url || dev.avatar_cid ? (
                            <SafariOptimizedImage
                              src={dev.avatar_cid ? getIPFSUrl(dev.avatar_cid) : dev.avatar_url!}
                              alt={dev.display_name || dev.username || 'Developer'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <User size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {dev.display_name || dev.username || 'Unknown Developer'}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {dev.tagline || 'Bitcoin Developer'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {developers.length === 0 && (
                      <div className="text-gray-400 text-center py-8">
                        {searchQuery ? 'No developers found matching your search' : 'No developers found'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Users ({users.length})
                  </h3>
                  <div className="space-y-1">
                    {users.map((user) => (
                      <Link
                        key={user.address}
                        href={`/${user.address}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                          {user.avatar_url || user.avatar_cid ? (
                            <SafariOptimizedImage
                              src={user.avatar_cid ? getIPFSUrl(user.avatar_cid) : user.avatar_url!}
                              alt={user.display_name || user.username || 'User'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                              <User size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {user.display_name || user.username || 'Unknown User'}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {user.tagline || 'Bitcoin User'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {users.length === 0 && (
                      <div className="text-gray-400 text-center py-8">
                        {searchQuery ? 'No users found matching your search' : 'No users found'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
