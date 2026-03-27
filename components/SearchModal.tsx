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

    if (!query.trim()) {
      setFilteredApps([]);
      setUsers([]);
      setDevelopers([]);
      setLoading(false);
      return;
    }

    switch (activeTab) {
      case 'apps':
        handleSearchApps(query);
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

    if (!searchQuery.trim()) {
      setFilteredApps([]);
      setUsers([]);
      setDevelopers([]);
      setLoading(false);
      return;
    }

    switch (tabId) {
      case 'apps':
        handleSearchApps(searchQuery);
        break;
      case 'developers':
        searchDevelopers(searchQuery);
        break;
      case 'users':
        searchUsers(searchQuery);
        break;
    }
  };


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
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-background/50 backdrop-blur-md pt-20">
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 bg-background/95 backdrop-blur-xl border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <Search className="text-foreground" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search apps, developers, users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent text-foreground text-lg placeholder:text-foreground/50 outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-background/50 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="text-foreground" size={20} />
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-background/80 text-foreground'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-background/50'
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
        <div className="flex-1 overflow-y-auto bg-background/20 backdrop-blur-sm">
          {loading && (
            <div className="text-foreground text-center py-8">Loading...</div>
          )}
          
          {!loading && (
            <>
              {/* Apps Tab */}
              {activeTab === 'apps' && (
                <div className="p-4">
                  <div className="space-y-1">
                    {searchQuery.trim() && filteredApps.map((app) => (
                      <Link
                        key={app.id}
                        href={`/apps/${app.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-foreground/10">
                          {app.imgCID ? (
                            <SafariOptimizedImage
                              src={getIPFSUrl(app.imgCID)}
                              alt={`${app.name} logo`}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-500">
                              <Code size={16} className="text-background" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-foreground font-medium text-sm truncate">{app.name}</div>
                            {app.verified && (
                              <Shield size={12} className="text-blue-400" />
                            )}
                          </div>
                          <div className="text-foreground text-xs truncate">
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
                            <div className="text-xs text-gray-500 px-2 py-0.5 bg-background rounded">
                              {app.category}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {!searchQuery.trim() ? (
                      <div className="text-foreground text-center py-8">
                        ...
                      </div>
                    ) : filteredApps.length === 0 ? (
                      <div className="text-foreground text-center py-8">
                        No apps found matching your search
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Developers Tab */}
              {activeTab === 'developers' && (
                <div className="p-4">

                  <div className="space-y-1">
                    {searchQuery.trim() && developers.map((dev) => (
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
                              <User size={16} className="text-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-medium text-sm truncate">
                            {dev.display_name || dev.username || 'Unknown Developer'}
                          </div>
                          <div className="text-foreground text-xs truncate">
                            {dev.tagline || 'Bitcoin Developer'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {!searchQuery.trim() ? (
                      <div className="text-foreground text-center py-8">
                        ...
                      </div>
                    ) : developers.length === 0 ? (
                      <div className="text-foreground text-center py-8">
                        No developers found matching your search
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="p-4">
                  <div className="space-y-1">
                    {searchQuery.trim() && users.map((user) => (
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
                              <User size={16} className="text-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground font-medium text-sm truncate">
                            {user.display_name || user.username || 'Unknown User'}
                          </div>
                          <div className="text-foreground text-xs truncate">
                            {user.tagline || 'Bitcoin User'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {!searchQuery.trim() ? (
                      <div className="text-foreground text-center py-8">
                        ...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="text-foreground text-center py-8">
                        No users found matching your search
                      </div>
                    ) : null}
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
