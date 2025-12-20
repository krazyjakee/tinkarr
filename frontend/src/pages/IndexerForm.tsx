import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';
import type { CreateIndexerRequest } from '../types';

export const IndexerForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<CreateIndexerRequest>({
    title: '',
    url: '',
    searchType: 'html_form',
    searchMethod: 'GET',
    searchQueryParam: 'q',
    enabled: true,
    requiresFlaresolverr: false,
  });

  const [resultMappingText, setResultMappingText] = useState('');
  const [searchParamsText, setSearchParamsText] = useState('');
  const [error, setError] = useState('');

  const { data: indexer } = useQuery({
    queryKey: ['indexer', id],
    queryFn: () => apiClient.getIndexer(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (indexer) {
      setFormData({
        title: indexer.title,
        url: indexer.url,
        favicon: indexer.favicon,
        requiresFlaresolverr: indexer.requiresFlaresolverr,
        enabled: indexer.enabled,
        searchType: indexer.searchType,
        searchUrl: indexer.searchUrl,
        searchMethod: indexer.searchMethod,
        searchQueryParam: indexer.searchQueryParam,
        searchParams: indexer.searchParams,
        rssUrl: indexer.rssUrl,
        rssType: indexer.rssType,
        rssParams: indexer.rssParams,
        resultSelector: indexer.resultSelector,
        resultMapping: indexer.resultMapping,
      });
      if (indexer.resultMapping) {
        setResultMappingText(JSON.stringify(indexer.resultMapping, null, 2));
      }
      if (indexer.searchParams) {
        setSearchParamsText(JSON.stringify(indexer.searchParams, null, 2));
      }
    }
  }, [indexer]);

  const createMutation = useMutation({
    mutationFn: (data: CreateIndexerRequest) => apiClient.createIndexer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexers'] });
      navigate('/indexers');
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create indexer');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateIndexerRequest) =>
      apiClient.updateIndexer(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexers'] });
      queryClient.invalidateQueries({ queryKey: ['indexer', id] });
      navigate('/indexers');
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update indexer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data: CreateIndexerRequest = { ...formData };

      if (resultMappingText.trim()) {
        data.resultMapping = JSON.parse(resultMappingText);
      }

      if (searchParamsText.trim()) {
        data.searchParams = JSON.parse(searchParamsText);
      }

      if (isEdit) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    } catch (err) {
      setError('Invalid JSON in result mapping or search params');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {isEdit ? 'Edit Indexer' : 'Add Indexer'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                URL *
              </label>
              <input
                type="url"
                name="url"
                id="url"
                required
                value={formData.url}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="enabled"
                id="enabled"
                checked={formData.enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                Enabled
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="requiresFlaresolverr"
                id="requiresFlaresolverr"
                checked={formData.requiresFlaresolverr}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="requiresFlaresolverr" className="ml-2 block text-sm text-gray-900">
                Requires Flaresolverr
              </label>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Search Configuration</h2>

            <div>
              <label htmlFor="searchType" className="block text-sm font-medium text-gray-700">
                Search Type
              </label>
              <select
                name="searchType"
                id="searchType"
                value={formData.searchType}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="html_form">HTML Form</option>
                <option value="rest_api">REST API</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <label htmlFor="searchUrl" className="block text-sm font-medium text-gray-700">
                Search URL
              </label>
              <input
                type="url"
                name="searchUrl"
                id="searchUrl"
                value={formData.searchUrl || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="searchMethod" className="block text-sm font-medium text-gray-700">
                Search Method
              </label>
              <select
                name="searchMethod"
                id="searchMethod"
                value={formData.searchMethod}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>

            <div>
              <label htmlFor="searchQueryParam" className="block text-sm font-medium text-gray-700">
                Search Query Parameter
              </label>
              <input
                type="text"
                name="searchQueryParam"
                id="searchQueryParam"
                value={formData.searchQueryParam || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Parameter name for the search query (e.g., "q")
              </p>
            </div>

            <div>
              <label htmlFor="searchParams" className="block text-sm font-medium text-gray-700">
                Additional Search Parameters (JSON)
              </label>
              <textarea
                name="searchParams"
                id="searchParams"
                rows={3}
                value={searchParamsText}
                onChange={(e) => setSearchParamsText(e.target.value)}
                placeholder='{"category": "all", "sort": "date"}'
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Result Parsing</h2>

            <div>
              <label htmlFor="resultSelector" className="block text-sm font-medium text-gray-700">
                Result Selector
              </label>
              <input
                type="text"
                name="resultSelector"
                id="resultSelector"
                value={formData.resultSelector || ''}
                onChange={handleInputChange}
                placeholder=".result-row"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              />
              <p className="mt-1 text-sm text-gray-500">
                CSS selector for result items
              </p>
            </div>

            <div>
              <label htmlFor="resultMapping" className="block text-sm font-medium text-gray-700">
                Result Mapping (JSON)
              </label>
              <textarea
                name="resultMapping"
                id="resultMapping"
                rows={8}
                value={resultMappingText}
                onChange={(e) => setResultMappingText(e.target.value)}
                placeholder={`{
  "title": ".title",
  "link": "a@href",
  "size": ".size",
  "seeders": ".seeds",
  "leechers": ".leech"
}`}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              />
              <p className="mt-1 text-sm text-gray-500">
                Map result fields to CSS selectors. Use @ for attributes (e.g., "a@href")
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/indexers')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                ? 'Update Indexer'
                : 'Create Indexer'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
