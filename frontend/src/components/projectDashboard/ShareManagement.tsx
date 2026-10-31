import React, { useState, useEffect } from 'react';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';

const { API_BASE_URL } = config;

interface Share {
  share_id: number;
  share_token: string;
  share_link: string;
  access_level: 'view' | 'edit';
  expires_at: string;
  created_at: string;
  shared_by?: {
    user_id: number;
    username: string;
    name: string;
    avatar: string;
  };
}

interface ShareManagementProps {
  projectSid: string;
}

const ShareManagement: React.FC<ShareManagementProps> = ({ projectSid }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create share form state
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const [expiryDays, setExpiryDays] = useState(7);

  useEffect(() => {
    fetchShares();
  }, [projectSid]);

  const fetchShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/projects/${projectSid}/shares`);
      if (!response.ok) {
        throw new Error('Failed to fetch shares');
      }
      const data = await response.json();
      setShares(data.shares || []);
    } catch (err) {
      setError('Failed to load shares');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetchWithAuth(`/api/projects/${projectSid}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_level: accessLevel,
          expiry_days: expiryDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const data = await response.json();
      setSuccess('Share link created successfully!');

      // Refresh shares list
      await fetchShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteShare = async (shareId: number) => {
    if (!confirm('Are you sure you want to revoke this share link?')) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetchWithAuth(`/api/projects/${projectSid}/shares/${shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete share');
      }

      setSuccess('Share link revoked successfully');
      await fetchShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyLink = (shareLink: string) => {
    navigator.clipboard.writeText(shareLink);
    setSuccess('Link copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const getAccessLevelColor = (level: string) => {
    return level === 'edit' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  };

  const getAccessLevelLabel = (level: string) => {
    return level === 'edit' ? 'Can Edit' : 'Can View';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3;
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Create New Share */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Create Share Link</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormControl fullWidth>
            <InputLabel>Access Level</InputLabel>
            <Select
              value={accessLevel}
              label="Access Level"
              onChange={(e) => setAccessLevel(e.target.value as 'view' | 'edit')}
            >
              <MenuItem value="view">View Only</MenuItem>
              <MenuItem value="edit">Can Edit</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Expires In</InputLabel>
            <Select
              value={expiryDays}
              label="Expires In"
              onChange={(e) => setExpiryDays(e.target.value as number)}
            >
              <MenuItem value={1}>1 Day</MenuItem>
              <MenuItem value={3}>3 Days</MenuItem>
              <MenuItem value={7}>7 Days</MenuItem>
              <MenuItem value={14}>14 Days</MenuItem>
              <MenuItem value={30}>30 Days</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateShare}
            fullWidth
            sx={{ height: '56px' }}
          >
            Create Share Link
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          <strong>View Only:</strong> Recipients can view the project but cannot make changes.<br />
          <strong>Can Edit:</strong> Recipients can view and edit the project.
        </p>
      </div>

      {/* Active Shares List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Active Share Links
          {shares.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({shares.length} {shares.length === 1 ? 'link' : 'links'})
            </span>
          )}
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <p className="text-gray-500 font-medium">No active share links</p>
            <p className="text-sm text-gray-400 mt-1">Create a share link to allow others to access this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div
                key={share.share_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {/* Access Level Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(share.access_level)}`}>
                      {getAccessLevelLabel(share.access_level)}
                    </span>

                    {/* Expiring Soon Warning */}
                    {isExpiringSoon(share.expires_at) && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⚠️ Expiring Soon
                      </span>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteShare(share.share_id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Revoke share"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Share Link */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={share.share_link}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(share.share_link)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>

                {/* Share Details */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    {share.shared_by && (
                      <div className="flex items-center gap-2">
                        {share.shared_by.avatar && (
                          <img
                            src={share.shared_by.avatar}
                            alt={share.shared_by.name}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span>Shared by <strong>{share.shared_by.name}</strong></span>
                      </div>
                    )}
                    <span>Created {formatDate(share.created_at)}</span>
                  </div>
                  <span className={isExpiringSoon(share.expires_at) ? 'text-yellow-600 font-medium' : ''}>
                    Expires {formatDate(share.expires_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareManagement;
