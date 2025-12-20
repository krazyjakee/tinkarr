import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

export const Settings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [flaresolverrUrl, setFlaresolverrUrl] = useState('http://localhost:8191/v1');
  const [flaresolverrEnabled, setFlaresolverrEnabled] = useState(false);
  const [maxResults, setMaxResults] = useState('100');
  const [cacheTtl, setCacheTtl] = useState('600');
  const [globalTimeout, setGlobalTimeout] = useState('30000');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      const flaresolverrUrlSetting = settings.find(
        (s) => s.key === 'flaresolverr_url'
      );
      if (flaresolverrUrlSetting) {
        setFlaresolverrUrl(flaresolverrUrlSetting.value);
      }

      const flaresolverrEnabledSetting = settings.find(
        (s) => s.key === 'flaresolverr_enabled'
      );
      if (flaresolverrEnabledSetting) {
        setFlaresolverrEnabled(flaresolverrEnabledSetting.value === 'true');
      }

      const maxResultsSetting = settings.find(
        (s) => s.key === 'max_results_per_indexer'
      );
      if (maxResultsSetting) {
        setMaxResults(maxResultsSetting.value);
      }

      const cacheTtlSetting = settings.find((s) => s.key === 'cache_ttl_seconds');
      if (cacheTtlSetting) {
        setCacheTtl(cacheTtlSetting.value);
      }

      const timeoutSetting = settings.find((s) => s.key === 'global_timeout_ms');
      if (timeoutSetting) {
        setGlobalTimeout(timeoutSetting.value);
      }
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => apiClient.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccess('Settings updated successfully');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update settings');
      setSuccess('');
    },
  });

  const testFlaresolverrMutation = useMutation({
    mutationFn: (url: string) => apiClient.testFlaresolverr(url),
    onSuccess: (data) => {
      if (data.success) {
        setSuccess(`Flaresolverr connected! Version: ${data.version}`);
        setError('');
      } else {
        setError(data.message);
        setSuccess('');
      }
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to test Flaresolverr');
      setSuccess('');
    },
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: () => apiClient.regenerateApiKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setSuccess('API key regenerated successfully');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
      window.location.reload();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to regenerate API key');
      setSuccess('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      flaresolverr_url: flaresolverrUrl,
      flaresolverr_enabled: flaresolverrEnabled.toString(),
      max_results_per_indexer: maxResults,
      cache_ttl_seconds: cacheTtl,
      global_timeout_ms: globalTimeout,
    });
  };

  const handleTestFlaresolverr = () => {
    testFlaresolverrMutation.mutate(flaresolverrUrl);
  };

  const handleRegenerateApiKey = () => {
    if (
      window.confirm(
        'Are you sure you want to regenerate your API key? This will invalidate your current key.'
      )
    ) {
      regenerateApiKeyMutation.mutate();
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              API Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Your API Key
                </label>
                <div className="mt-1 flex">
                  <input
                    type="text"
                    value={user?.apiKey || ''}
                    readOnly
                    className="block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 bg-gray-50 sm:text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateApiKey}
                    disabled={regenerateApiKeyMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Use this API key in your *arr applications to connect to Tinkarr
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Flaresolverr Configuration
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={flaresolverrEnabled}
                  onChange={(e) => setFlaresolverrEnabled(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable Flaresolverr
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Flaresolverr URL
                </label>
                <input
                  type="url"
                  value={flaresolverrUrl}
                  onChange={(e) => setFlaresolverrUrl(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <button
                type="button"
                onClick={handleTestFlaresolverr}
                disabled={testFlaresolverrMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {testFlaresolverrMutation.isPending
                  ? 'Testing...'
                  : 'Test Connection'}
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              General Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Results Per Indexer
                </label>
                <input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  min="1"
                  max="1000"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cache TTL (seconds)
                </label>
                <input
                  type="number"
                  value={cacheTtl}
                  onChange={(e) => setCacheTtl(e.target.value)}
                  min="0"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Global Timeout (ms)
                </label>
                <input
                  type="number"
                  value={globalTimeout}
                  onChange={(e) => setGlobalTimeout(e.target.value)}
                  min="1000"
                  max="120000"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
