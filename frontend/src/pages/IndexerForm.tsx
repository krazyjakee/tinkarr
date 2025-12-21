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
  const [rssParamsText, setRssParamsText] = useState('');
  const [rssUrlGeneratorCode, setRssUrlGeneratorCode] = useState('');
  const [rssParamsMode, setRssParamsMode] = useState<'static' | 'code'>('static');
  const [error, setError] = useState('');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
        rssUrlGeneratorCode: indexer.rssUrlGeneratorCode,
        rssMethod: indexer.rssMethod || 'GET',
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

      if (indexer.rssParams) {
        // If it's a string, parse it first to format properly
        const params = typeof indexer.rssParams === 'string'
          ? JSON.parse(indexer.rssParams)
          : indexer.rssParams;
        setRssParamsText(JSON.stringify(params, null, 2));
      }

      // Set RSS params mode
      if (indexer.rssUrlGeneratorCode) {
        setRssParamsMode('code');
        setRssUrlGeneratorCode(indexer.rssUrlGeneratorCode);
      } else {
        setRssParamsMode('static');
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

    const data: CreateIndexerRequest = { ...formData };

    // Set mapping type
    data.resultMappingType = mappingType;

    try {
      // Handle mapping based on type
      if (mappingType === 'json') {
        if (resultMappingText.trim()) {
          try {
            data.resultMapping = JSON.parse(resultMappingText);
          } catch (e) {
            throw new Error('Invalid JSON in Result Mapping');
          }
        }
        data.resultMappingCode = undefined;
      } else {
        // Code mapping
        data.resultMappingCode = resultMappingCode;
        data.resultMapping = undefined;
      }

      if (searchParamsText.trim()) {
        try {
          data.searchParams = JSON.parse(searchParamsText);
        } catch (e) {
          throw new Error('Invalid JSON in Search Parameters');
        }
      }

      // Handle RSS params based on mode
      if (rssParamsMode === 'static') {
        if (rssParamsText.trim()) {
          try {
            data.rssParams = JSON.parse(rssParamsText);
          } catch (e) {
            throw new Error('Invalid JSON in RSS Parameters');
          }
        }
        data.rssUrlGeneratorCode = undefined;
      } else {
        // Code mode
        data.rssUrlGeneratorCode = rssUrlGeneratorCode;
        data.rssParams = undefined;
      }

      if (isEdit) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid form data');
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

  const handleExport = () => {
    try {
      // Prepare the export data with all current form state
      const exportObj = {
        ...formData,
        resultMappingText,
        resultMappingCode,
        mappingType,
        searchParamsText,
        rssParamsText,
        rssUrlGeneratorCode,
        rssParamsMode,
      };

      // Convert to JSON and then to base64
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      setExportData(base64);
      setShowExport(true);
      setShowImport(false);
    } catch (err: any) {
      setError('Failed to export: ' + err.message);
    }
  };

  const handleImport = () => {
    setImportError('');
    try {
      if (!importData.trim()) {
        setImportError('Please enter base64 data to import');
        return;
      }

      // Decode base64 and parse JSON
      const jsonStr = decodeURIComponent(escape(atob(importData.trim())));
      const importObj = JSON.parse(jsonStr);

      // Update form data
      const {
        resultMappingText: impResultMappingText,
        resultMappingCode: impResultMappingCode,
        mappingType: impMappingType,
        searchParamsText: impSearchParamsText,
        rssParamsText: impRssParamsText,
        rssUrlGeneratorCode: impRssUrlGeneratorCode,
        rssParamsMode: impRssParamsMode,
        ...impFormData
      } = importObj;

      // Set all the form data
      setFormData(impFormData);

      // Set editor states
      if (impResultMappingText !== undefined) setResultMappingText(impResultMappingText);
      if (impResultMappingCode !== undefined) setResultMappingCode(impResultMappingCode);
      if (impMappingType !== undefined) setMappingType(impMappingType);
      if (impSearchParamsText !== undefined) setSearchParamsText(impSearchParamsText);
      if (impRssParamsText !== undefined) setRssParamsText(impRssParamsText);
      if (impRssUrlGeneratorCode !== undefined) setRssUrlGeneratorCode(impRssUrlGeneratorCode);
      if (impRssParamsMode !== undefined) setRssParamsMode(impRssParamsMode);

      // Clear import data and show success
      setImportData('');
      setShowImport(false);
      setError('');
    } catch (err: any) {
      setImportError('Failed to import: ' + (err.message || 'Invalid data format'));
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportData).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Indexer' : 'Add Indexer'}
            </h1>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Import / Export
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
              <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h2>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                URL *
              </label>
              <input
                type="url"
                name="url"
                id="url"
                required
                value={formData.url}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
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
              <label htmlFor="requiresFlaresolverr" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                Requires Flaresolverr
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Search Configuration</h2>

            <div>
              <label htmlFor="searchType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Type
              </label>
              <select
                name="searchType"
                id="searchType"
                value={formData.searchType}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="html_form">HTML Form</option>
                <option value="rest_api">REST API</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <label htmlFor="searchUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search URL
              </label>
              <input
                type="url"
                name="searchUrl"
                id="searchUrl"
                value={formData.searchUrl || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="searchMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Method
              </label>
              <select
                name="searchMethod"
                id="searchMethod"
                value={formData.searchMethod}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>

            <div>
              <label htmlFor="searchQueryParam" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Query Parameter
              </label>
              <input
                type="text"
                name="searchQueryParam"
                id="searchQueryParam"
                value={formData.searchQueryParam || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Parameter name for the search query (e.g., "q")
              </p>
            </div>

            <div>
              <label htmlFor="searchParams" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Search Parameters (JSON)
              </label>
              <textarea
                name="searchParams"
                id="searchParams"
                rows={3}
                value={searchParamsText}
                onChange={(e) => setSearchParamsText(e.target.value)}
                placeholder='{"category": "all", "sort": "date"}'
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">RSS Configuration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure this section to enable RSS feeds and recent releases support.
              This is used when no search query is provided.
            </p>

            <div>
              <label htmlFor="rssUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                RSS Base URL
              </label>
              <input
                type="url"
                name="rssUrl"
                id="rssUrl"
                value={formData.rssUrl || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Base URL for RSS feed (parameters will be added below)
              </p>
            </div>

            <div>
              <label htmlFor="rssMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                RSS Method
              </label>
              <select
                name="rssMethod"
                id="rssMethod"
                value={formData.rssMethod || 'GET'}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>

            {/* Tab Headers */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="RSS Params Mode">
                <button
                  type="button"
                  onClick={() => setRssParamsMode('static')}
                  className={`${
                    rssParamsMode === 'static'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Static Parameters
                </button>
                <button
                  type="button"
                  onClick={() => setRssParamsMode('code')}
                  className={`${
                    rssParamsMode === 'code'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Code-Based Generator
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {rssParamsMode === 'static' ? (
              <div>
                <label htmlFor="rssParams" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  RSS Parameters (JSON)
                </label>
                <textarea
                  name="rssParams"
                  id="rssParams"
                  rows={3}
                  value={rssParamsText}
                  onChange={(e) => setRssParamsText(e.target.value)}
                  placeholder='{"cat": "1", "sort": "date"}'
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Static URL parameters as JSON
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RSS URL Generator Code
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Write JavaScript code that returns an object with URL parameters. Available variables:
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">query</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">season</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">episode</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">imdbId</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">tvdbId</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">categories</code>,
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded mx-1">baseUrl</code>
                </p>
                <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                  <Editor
                    height="200px"
                    defaultLanguage="javascript"
                    value={rssUrlGeneratorCode}
                    onChange={(value) => setRssUrlGeneratorCode(value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Example: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">return &#123; cat: categories.split(',').includes('5000') ? '2' : '1', sort: 'date' &#125;;</code>
                </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Result Parsing</h2>

            <div>
              <label htmlFor="resultSelector" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Result Selector
              </label>
              <input
                type="text"
                name="resultSelector"
                id="resultSelector"
                value={formData.resultSelector || ''}
                onChange={handleInputChange}
                placeholder=".result-row"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                CSS selector for result items
              </p>
            </div>

            {/* Tab Headers */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Mapping Type">
                <button
                  type="button"
                  onClick={() => setMappingType('json')}
                  className={`${
                    mappingType === 'json'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  JSON Mapping
                </button>
                <button
                  type="button"
                  onClick={() => setMappingType('code')}
                  className={`${
                    mappingType === 'code'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  JavaScript Code
                </button>
              </nav>
            </div>

            {/* JSON Tab Content */}
            {mappingType === 'json' && (
              <div>
                <label htmlFor="resultMapping" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
  "magnetUrl": ".magnet@href",
  "size": ".size",
  "seeders": ".seeds",
  "leechers": ".leech",
  "category": ".category",
  "pubDate": ".date",
  "description": ".description",
  "comments": ".comments@href",
  "imdb": ".imdb@data-imdb",
  "tvdbId": ".tvdb@data-tvdb",
  "rageId": ".rage@data-rage",
  "type": ".type",
  "infoHash": ".hash@data-hash",
  "coverUrl": ".cover@src",
  "bannerUrl": ".banner@src",
  "minimumRatio": ".ratio",
  "minimumSeedTime": ".seedtime",
  "grabs": ".grabs"
}`}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                />
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium">Map result fields to CSS selectors. Use @ for attributes (e.g., "a@href")</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-800">
                      Available fields (click to expand)
                    </summary>
                    <div className="mt-2 ml-4 space-y-1 text-xs">
                      <p><strong>Required:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">title</code> - Torrent title</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">link</code> - Download link or torrent file URL</li>
                      </ul>
                      <p className="mt-2"><strong>Common:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">magnetUrl</code> - Magnet link</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">size</code> - File size (e.g., "1.5 GB")</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">seeders</code> - Number of seeders</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">leechers</code> - Number of leechers</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">category</code> - Content category</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">pubDate</code> - Publication date</li>
                      </ul>
                      <p className="mt-2"><strong>Optional:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">description</code> - Torrent description</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">comments</code> - Comments page URL</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">grabs</code> - Number of downloads</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">infoHash</code> - Torrent info hash</li>
                      </ul>
                      <p className="mt-2"><strong>Media IDs:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">imdb</code> / <code className="bg-gray-100 px-1 py-0.5 rounded">imdbId</code> - IMDB ID</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">tvdbId</code> - TVDB ID</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">tmdbId</code> - TMDB ID</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">rageId</code> - TVRage ID</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">tvMazeId</code> - TVMaze ID</li>
                      </ul>
                      <p className="mt-2"><strong>Media URLs:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">coverUrl</code> - Poster/cover image URL</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">bannerUrl</code> - Banner image URL</li>
                      </ul>
                      <p className="mt-2"><strong>Tracker Requirements:</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">type</code> - Content type (movie, series, music, book)</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">minimumRatio</code> - Required ratio (e.g., "1.0")</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">minimumSeedTime</code> - Min seed time in seconds (e.g., "172800" for 48 hours)</li>
                      </ul>
                    </div>
                  </details>
                </div>
              </div>
            )}

            {/* Code Tab Content */}
            {mappingType === 'code' && (
              <div>
                <label htmlFor="resultMappingCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Result Mapping (JavaScript)
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
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
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p className="font-medium">Your code receives:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">items[]</code> - Array of elements with helpers (find, text, html, attrs)</li>
                    <li><code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">baseUrl</code> - Page URL for resolving relative links</li>
                  </ul>
                  <p className="font-medium mt-2">Example:</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`return items.map(item => ({
  title: item.find('.title')?.text || '', // "The Matrix"
  link: item.find('a')?.attr('href') || '', // "https://example.com/download/the.matrix.torrent"
  magnetUrl: item.find('.magnet')?.attr('href') || '', // "magnet:?xt=urn:btih:..."
  size: item.find('.size')?.text || '', // "1.4 GB"
  seeders: item.find('.seeders')?.text || '0', // "123"
  leechers: item.find('.leechers')?.text || '0', // "45"
  category: item.find('.category')?.text || '', // "Movies/HD"
  pubDate: item.find('.date')?.text || '', // "2023-10-27 14:30:00"
  description: item.find('.description')?.text || '', // "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers."
  comments: item.find('.comments')?.attr('href') || '', // "https://example.com/comments/the.matrix"
  imdb: item.find('.imdb')?.attr('data-imdb') || '', // "tt0133093"
  tvdbId: item.find('.tvdb')?.attr('data-tvdb') || '', // "79340"
  type: item.find('.type')?.text || 'series', // "movie"
  infoHash: item.find('.hash')?.attr('data-hash') || '', // "d41d8cd98f00b204e9800998ecf8427e"
  coverUrl: item.find('.cover')?.attr('src') || '', // "https://example.com/covers/the.matrix.jpg"
  bannerUrl: item.find('.banner')?.attr('src') || '', // "https://example.com/banners/the.matrix.jpg"
  minimumRatio: item.find('.ratio')?.text || '1.0', // "1.0"
  minimumSeedTime: item.find('.seedtime')?.text || '172800', // "172800"
  grabs: item.find('.grabs')?.text || '0' // "500"
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
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
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

      {/* Import/Export Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowModal(false)}
            ></div>

            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Center modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4" id="modal-title">
                        Import / Export Configuration
                      </h3>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Export your indexer configuration as base64 to share or backup, or import a configuration from base64.
                      </p>

                      <div className="flex space-x-3 mb-6">
                        <button
                          type="button"
                          onClick={handleExport}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Export Configuration
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImport(!showImport);
                            setShowExport(false);
                            setImportError('');
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Import Configuration
                        </button>
                      </div>

                      {showExport && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Exported Configuration (Base64)
                            </label>
                            <textarea
                              readOnly
                              value={exportData}
                              rows={8}
                              className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs"
                            />
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={handleCopyToClipboard}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              Copy to Clipboard
                            </button>
                            {copySuccess && (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Copied!
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {showImport && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Paste Base64 Configuration
                            </label>
                            <textarea
                              value={importData}
                              onChange={(e) => setImportData(e.target.value)}
                              rows={8}
                              placeholder="Paste your base64 encoded configuration here..."
                              className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs"
                            />
                          </div>
                          {importError && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              {importError}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleImport}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            Import Configuration
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setShowExport(false);
                      setShowImport(false);
                      setImportError('');
                      setCopySuccess(false);
                    }}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
};
