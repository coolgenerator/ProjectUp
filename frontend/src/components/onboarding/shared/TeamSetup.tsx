import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { searchUsersByQuery } from '../../../services/contactServices';
import { toast } from 'react-hot-toast';
import { RootState } from '../../../store';

export interface TeamMember {
  id?: string;
  userId?: number;
  isPlaceholder: boolean;
  name: string;
  email?: string;
  role: 'admin' | 'editor' | 'viewer';
  avatarUrl?: string;
}

interface TeamSetupProps {
  members: TeamMember[];
  onChange: (members: TeamMember[]) => void;
  onComplete?: () => void;
  onBack?: () => void;
  showRoles?: boolean;
  maxMembers?: number;
}

interface SearchResult {
  id: number;
  username: string;
  email?: string;
  preferred_name?: string;
  last_name?: string;
  avatar_url?: string;
  field?: string;
  school?: string;
}

const TeamSetup: React.FC<TeamSetupProps> = ({
  members,
  onChange,
  onComplete,
  onBack,
  showRoles = true,
  maxMembers,
}) => {
  // Get current user from Redux store to identify "You"
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMode, setAddMode] = useState<'registered' | 'placeholder' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [placeholderForm, setPlaceholderForm] = useState({
    name: '',
    email: '',
    role: 'editor' as 'admin' | 'editor' | 'viewer',
  });

  // Debounced search
  useEffect(() => {
    if (addMode !== 'registered' || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, addMode]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchUsersByQuery(searchQuery.trim());
      // Filter out users who are already added as members
      const memberUserIds = members.map(m => m.userId).filter(id => id !== undefined);
      const filteredResults = results.filter((user: SearchResult) => !memberUserIds.includes(user.id));
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddRegisteredUser = (user: SearchResult, role: 'admin' | 'editor' | 'viewer' = 'editor') => {
    const displayName = user.preferred_name || user.username;
    const fullName = user.last_name ? `${displayName} ${user.last_name}` : displayName;

    const newMember: TeamMember = {
      id: `user-${user.id}`,
      userId: user.id,
      isPlaceholder: false,
      name: fullName,
      role: role,
      avatarUrl: user.avatar_url,
    };

    onChange([...members, newMember]);
    setSearchQuery('');
    setSearchResults([]);
    setAddMode(null);
    setShowAddMenu(false);
    toast.success(`Added ${fullName} to team`);
  };

  const handleAddPlaceholder = () => {
    if (!placeholderForm.name || !placeholderForm.email) return;

    const newMember: TeamMember = {
      id: `placeholder-${Date.now()}`,
      isPlaceholder: true,
      name: placeholderForm.name,
      email: placeholderForm.email,
      role: placeholderForm.role,
    };

    onChange([...members, newMember]);
    setPlaceholderForm({ name: '', email: '', role: 'editor' });
    setAddMode(null);
    setShowAddMenu(false);
  };

  const handleRemoveMember = (id: string) => {
    onChange(members.filter((m) => m.id !== id));
  };

  const handleRoleChange = (id: string, newRole: 'admin' | 'editor' | 'viewer') => {
    onChange(
      members.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canAddMore = !maxMembers || members.length < maxMembers;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-600">
            Add teammates who will work on this project
          </p>
        </div>
        {canAddMore && (
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Add Menu */}
      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            {!addMode ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAddMode('registered')}
                  className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Registered User</h4>
                      <p className="text-xs text-gray-600">They have an account</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAddMode('placeholder')}
                  className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Invite Later</h4>
                      <p className="text-xs text-gray-600">Add placeholder</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : addMode === 'placeholder' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900">Add Placeholder Member</h4>
                  <button
                    onClick={() => setAddMode(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={placeholderForm.name}
                      onChange={(e) =>
                        setPlaceholderForm({ ...placeholderForm, name: e.target.value })
                      }
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={placeholderForm.email}
                      onChange={(e) =>
                        setPlaceholderForm({ ...placeholderForm, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {showRoles && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={placeholderForm.role}
                      onChange={(e) =>
                        setPlaceholderForm({
                          ...placeholderForm,
                          role: e.target.value as 'admin' | 'editor' | 'viewer',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer - Can view only</option>
                      <option value="editor">Editor - Can edit content</option>
                      <option value="admin">Admin - Can manage team</option>
                    </select>
                  </div>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 You can invite this person later. They'll receive an invite link when
                    you're ready.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setAddMode(null)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPlaceholder}
                    disabled={!placeholderForm.name || !placeholderForm.email}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Member
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900">Search Registered Users</h4>
                  <button
                    onClick={() => {
                      setAddMode(null);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.trim() && (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((user) => {
                        const displayName = user.preferred_name || user.username;
                        const fullName = user.last_name ? `${displayName} ${user.last_name}` : displayName;

                        return (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                            onClick={() => handleAddRegisteredUser(user)}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Avatar */}
                              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden ${
                                !user.avatar_url || user.avatar_url.trim() === '' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : ''
                              }`}>
                                {/* Fallback initials - hidden when image loads */}
                                <span className="fallback-initials" style={{ display: 'none' }}>{fullName.charAt(0).toUpperCase()}</span>
                                {user.avatar_url && user.avatar_url.trim() !== '' ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={fullName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                                        const fallback = parent.querySelector('.fallback-initials') as HTMLElement;
                                        if (fallback) fallback.style.display = 'block';
                                      }
                                    }}
                                  />
                                ) : (
                                  <span>{fullName.charAt(0).toUpperCase()}</span>
                                )}
                              </div>

                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-gray-900 truncate">{fullName}</h5>
                                <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                                {user.school && (
                                  <p className="text-xs text-gray-500 truncate">{user.school}</p>
                                )}
                              </div>

                              {/* Add Icon */}
                              <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : !isSearching ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p>No users found</p>
                        <p className="text-sm mt-1">Try a different search term</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {!searchQuery.trim() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 Search for users by their username or email address
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-600 font-medium">No other members yet</p>
            <p className="text-sm text-gray-500">Click "Add Member" to invite teammates</p>
          </div>
        ) : (
          members.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* Avatar */}
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0 ${
                  !member.avatarUrl || member.avatarUrl.trim() === '' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : ''
                }`}>
                  {/* Fallback initials - hidden when image loads */}
                  <span className="fallback-initials" style={{ display: 'none' }}>{member.isPlaceholder ? '?' : member.name.charAt(0).toUpperCase()}</span>
                  {member.avatarUrl && member.avatarUrl.trim() !== '' ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                          const fallback = parent.querySelector('.fallback-initials') as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }
                      }}
                    />
                  ) : (
                    <span>{member.isPlaceholder ? '?' : member.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    {currentUser && member.userId === currentUser.id && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs rounded-full font-semibold border border-purple-200">
                        You
                      </span>
                    )}
                    {member.isPlaceholder && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Pending Invite
                      </span>
                    )}
                  </div>
                  {member.email && (
                    <p className="text-sm text-gray-600">{member.email}</p>
                  )}
                </div>

                {/* Role */}
                {showRoles && (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(
                        member.id!,
                        e.target.value as 'admin' | 'editor' | 'viewer'
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                      member.role
                    )} border-0 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                )}

                {/* Remove Button - Only show if not the current user */}
                {currentUser && member.userId === currentUser.id ? (
                  <div className="w-9 h-9" />
                ) : (
                  <button
                    onClick={() => handleRemoveMember(member.id!)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Summary */}
      {members.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Team Summary:</p>
              <p>
                {members.length} member{members.length !== 1 ? 's' : ''} total
                {members.filter((m) => m.isPlaceholder).length > 0 && (
                  <> • {members.filter((m) => m.isPlaceholder).length} pending invite(s)</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {(onBack || onComplete) && (
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              ← Back
            </button>
          )}
          {!onBack && <div />}
          {onComplete && (
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
            >
              Continue to Review →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamSetup;
