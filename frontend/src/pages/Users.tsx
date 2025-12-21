import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

export const Users = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    document.title = 'User Management - Tinkarr';
  }, []);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getAllUsers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => apiClient.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccess('User deleted successfully');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to delete user');
      setSuccess('');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      apiClient.resetUserPassword(userId, password),
    onSuccess: () => {
      setSuccess('Password reset successfully');
      setError('');
      setResetUserId(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to reset password');
      setSuccess('');
    },
  });

  const handleDelete = (userId: number, username: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete user "${username}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(userId);
    }
  };

  const handleResetPassword = (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (
      window.confirm(
        'Are you sure you want to reset this user\'s password?'
      )
    ) {
      resetPasswordMutation.mutate({ userId, password: newPassword });
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">
              Access denied. Admin privileges required.
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          User Management
        </h1>

        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading users...</div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users?.map((user: User) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-500">
                            (You)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isAdmin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono truncate max-w-xs">
                        {user.apiKey.substring(0, 16)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {resetUserId === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="block w-32 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm"
                          />
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            disabled={resetPasswordMutation.isPending}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setResetUserId(null);
                              setNewPassword('');
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-4">
                          <button
                            onClick={() => setResetUserId(user.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Reset Password
                          </button>
                          {!user.isAdmin && (
                            <button
                              onClick={() => handleDelete(user.id, user.username)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
