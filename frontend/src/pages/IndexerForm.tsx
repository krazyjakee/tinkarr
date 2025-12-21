import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';
import type { CreateIndexerRequest } from '../types';
import Editor from '@monaco-editor/react';

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
  const [resultMappingCode, setResultMappingCode] = useState('');
  const [mappingType, setMappingType] = useState<'json' | 'code'>('json');
  const [searchParamsText, setSearchParamsText] = useState('');
  const [error, setError] = useState('');
  const [autoConfigureLoading, setAutoConfigureLoading] = useState(false);
  const [autoConfigureMessage, setAutoConfigureMessage] = useState('');

  const { data: indexer } = useQuery({
    queryKey: ['indexer', id],
    queryFn: () => apiClient.getIndexer(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    document.title = isEdit ? 'Edit Indexer - Tinkarr' : 'New Indexer - Tinkarr';
  }, [isEdit]);

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
        resultMappingType: indexer.resultMappingType,
        resultMappingCode: indexer.resultMappingCode,
      });

      // Set mapping type
      setMappingType(indexer.resultMappingType || 'json');

      // Handle JSON mapping
      if (indexer.resultMapping) {
        // If it's a string, parse it first to format properly
        const mapping = typeof indexer.resultMapping === 'string'
          ? JSON.parse(indexer.resultMapping)
          : indexer.resultMapping;
        setResultMappingText(JSON.stringify(mapping, null, 2));
      }

      // Handle code mapping
      if (indexer.resultMappingCode) {
        setResultMappingCode(indexer.resultMappingCode);
      }

      if (indexer.searchParams) {
        // If it's a string, parse it first to format properly
        const params = typeof indexer.searchParams === 'string'
          ? JSON.parse(indexer.searchParams)
          : indexer.searchParams;
        setSearchParamsText(JSON.stringify(params, null, 2));
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

      // Set mapping type
      data.resultMappingType = mappingType;

      // Handle mapping based on type
      if (mappingType === 'json') {
        if (resultMappingText.trim()) {
          data.resultMapping = JSON.parse(resultMappingText);
        }
        data.resultMappingCode = undefined;
      } else {
        // Code mapping
        data.resultMappingCode = resultMappingCode;
        data.resultMapping = undefined;
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

  const handleAutoPopulate = async () => {
    if (!formData.url) {
      setAutoConfigureMessage('Please enter a URL first');
      return;
    }

    setAutoConfigureLoading(true);
    setAutoConfigureMessage('');
    setError('');

    try {
      // Use Flaresolverr if the checkbox is checked
      const result = await apiClient.autoConfigureFromUrl(
        formData.url,
        formData.requiresFlaresolverr || false
      );

      if (result.success && result.config) {
        // Update form data with detected configuration
        setFormData((prev) => ({
          ...prev,
          searchUrl: result.config?.searchUrl || prev.searchUrl,
          searchMethod: (result.config?.searchMethod as 'GET' | 'POST') || prev.searchMethod,
          searchQueryParam: result.config?.searchQueryParam || prev.searchQueryParam,
          rssUrl: result.config?.rssUrl || prev.rssUrl,
        }));

        // Update search params if any were detected
        if (result.config?.searchParams && Object.keys(result.config.searchParams).length > 0) {
          setSearchParamsText(JSON.stringify(result.config.searchParams, null, 2));
        }

        setAutoConfigureMessage(
          result.message || 'Configuration populated successfully!'
        );
      } else {
        setError(result.error || 'Failed to auto-configure');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to auto-configure indexer');
    } finally {
      setAutoConfigureLoading(false);
    }
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Search Configuration</h2>
              <button
                type="button"
                onClick={handleAutoPopulate}
                disabled={!formData.url || autoConfigureLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {autoConfigureLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Auto-configuring...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Auto-populate from URL
                  </>
                )}
              </button>
            </div>

            {autoConfigureMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{autoConfigureMessage}</p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Tab Headers */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Mapping Type">
                <button
                  type="button"
                  onClick={() => setMappingType('json')}
                  className={`${
                    mappingType === 'json'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  JSON Mapping
                </button>
                <button
                  type="button"
                  onClick={() => setMappingType('code')}
                  className={`${
                    mappingType === 'code'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  JavaScript Code
                </button>
              </nav>
            </div>

            {/* JSON Tab Content */}
            {mappingType === 'json' && (
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
  "leechers": ".leech",
  "category": ".category",
  "pubDate": ".date"
}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Map result fields to CSS selectors. Use @ for attributes (e.g., "a@href")
                </p>
              </div>
            )}

            {/* Code Tab Content */}
            {mappingType === 'code' && (
              <div>
                <label htmlFor="resultMappingCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Result Mapping (JavaScript)
                </label>
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <Editor
                    height="400px"
                    language="javascript"
                    value={resultMappingCode}
                    onChange={(value) => setResultMappingCode(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600 space-y-2">
                  <p className="font-medium">Your code receives:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">items[]</code> - Array of elements with helpers (find, text, html, attrs)</li>
                    <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">baseUrl</code> - Page URL for resolving relative links</li>
                  </ul>
                  <p className="font-medium mt-2">Example:</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`return items.map(item => ({
  title: item.find('.title')?.text || '',
  link: item.find('a')?.attr('href') || '',
  size: item.find('.size')?.text || '',
  seeders: item.find('.seeders')?.text || '0',
  leechers: item.find('.leechers')?.text || '0',
  category: item.find('.category')?.text || '',
  pubDate: item.find('.date')?.text || ''
}));`}
                  </pre>
                </div>
              </div>
            )}
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
