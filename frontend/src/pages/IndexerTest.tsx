import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';

interface TestScenario {
  name: string;
  description: string;
  params: {
    query?: string;
    season?: number;
    episode?: number;
    imdbId?: string;
    tvdbId?: string;
    categories?: string[];
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Basic RSS Feed',
    description: 'Test RSS feed with no query parameters',
    params: {},
  },
  {
    name: 'TV Single Episode',
    description: 'Test single episode request (typical Sonarr)',
    params: {
      season: 1,
      episode: 5,
      tvdbId: '12345',
      categories: ['5030', '5040'],
    },
  },
  {
    name: 'TV Full Season',
    description: 'Test full season request (typical Sonarr)',
    params: {
      season: 2,
      categories: ['5030'],
    },
  },
  {
    name: 'Movie Request',
    description: 'Test movie request (typical Radarr)',
    params: {
      imdbId: 'tt1234567',
      categories: ['2000', '2040'],
    },
  },
  {
    name: 'Search Query',
    description: 'Test with search query (not RSS)',
    params: {
      query: 'Breaking Bad',
    },
  },
];

export const IndexerTest = () => {
  useEffect(() => {
    document.title = 'Test Indexer - Tinkarr';
  }, []);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form state
  const [query, setQuery] = useState('');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [imdbId, setImdbId] = useState('');
  const [tvdbId, setTvdbId] = useState('');
  const [categories, setCategories] = useState('');
  const [useFlaresolverr, setUseFlaresolverr] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: indexer } = useQuery({
    queryKey: ['indexer', id],
    queryFn: () => apiClient.getIndexer(Number(id)),
  });

  const testMutation = useMutation({
    mutationFn: (params: any) =>
      apiClient.testIndexer(Number(id), params),
    onSuccess: (data) => {
      setTestResult(data);
      setPreviewResult(null); // Clear preview when running full test
    },
  });

  const previewMutation = useMutation({
    mutationFn: (params: any) =>
      apiClient.previewIndexer(Number(id), params),
    onSuccess: (data) => {
      setPreviewResult(data);
      setTestResult(null); // Clear test when running preview
    },
  });

  const buildRequestParams = () => {
    const params: any = {};

    // Only include query if it's not empty
    if (query.trim()) {
      params.query = query.trim();
    }

    // Include RSS context parameters if provided
    if (season) params.season = parseInt(season);
    if (episode) params.episode = parseInt(episode);
    if (imdbId.trim()) params.imdbId = imdbId.trim();
    if (tvdbId.trim()) params.tvdbId = tvdbId.trim();
    if (categories.trim()) {
      params.categories = categories.split(',').map(c => c.trim());
    }

    return params;
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildRequestParams();
    previewMutation.mutate(params);
  };

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    const params = {
      ...buildRequestParams(),
      useFlaresolverr,
    };
    testMutation.mutate(params);
  };

  const loadScenario = (scenario: TestScenario) => {
    setQuery(scenario.params.query || '');
    setSeason(scenario.params.season?.toString() || '');
    setEpisode(scenario.params.episode?.toString() || '');
    setImdbId(scenario.params.imdbId || '');
    setTvdbId(scenario.params.tvdbId || '');
    setCategories(scenario.params.categories?.join(', ') || '');
    setShowAdvanced(true);
    setTestResult(null);
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <button
            onClick={() => navigate('/indexers')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
          >
            ← Back to Indexers
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            Test Indexer: {indexer?.title}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Test your indexer with typical RSS requests from Sonarr/Radarr or custom search queries
          </p>
        </div>

        {/* Test Scenarios */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick Test Scenarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEST_SCENARIOS.map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => loadScenario(scenario)}
                className="text-left p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {scenario.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {scenario.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Test Form */}
        <form onSubmit={handleTest} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search Query
              </label>
              <input
                type="text"
                name="query"
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Leave empty to test RSS feed"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty to test RSS feed. Enter a query to test search URL.
              </p>
            </div>

            {/* Advanced RSS Parameters */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                {showAdvanced ? '− Hide' : '+ Show'} RSS Context Parameters
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  These parameters simulate typical requests from Sonarr/Radarr and are used by RSS URL Generator Code.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="season" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Season
                    </label>
                    <input
                      type="number"
                      name="season"
                      id="season"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      placeholder="e.g., 1"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="episode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Episode
                    </label>
                    <input
                      type="number"
                      name="episode"
                      id="episode"
                      value={episode}
                      onChange={(e) => setEpisode(e.target.value)}
                      placeholder="e.g., 5"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="tvdbId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      TVDB ID
                    </label>
                    <input
                      type="text"
                      name="tvdbId"
                      id="tvdbId"
                      value={tvdbId}
                      onChange={(e) => setTvdbId(e.target.value)}
                      placeholder="e.g., 12345"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="imdbId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      IMDB ID
                    </label>
                    <input
                      type="text"
                      name="imdbId"
                      id="imdbId"
                      value={imdbId}
                      onChange={(e) => setImdbId(e.target.value)}
                      placeholder="e.g., tt1234567"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="categories" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categories
                  </label>
                  <input
                    type="text"
                    name="categories"
                    id="categories"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="e.g., 5030, 5040 (comma-separated)"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Common: 5000 (TV), 5030 (TV/SD), 5040 (TV/HD), 2000 (Movies), 2040 (Movies/HD)
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="useFlaresolverr"
                id="useFlaresolverr"
                checked={useFlaresolverr}
                onChange={(e) => setUseFlaresolverr(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="useFlaresolverr" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Use Flaresolverr (applies to Test Indexer only)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewMutation.isPending}
                className="flex-1 px-4 py-2 border border-indigo-600 dark:border-indigo-500 rounded-md shadow-sm text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {previewMutation.isPending ? 'Previewing...' : 'Preview Request'}
              </button>
              <button
                type="submit"
                disabled={testMutation.isPending}
                className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {testMutation.isPending ? 'Testing...' : 'Test Indexer'}
              </button>
            </div>
          </div>
        </form>

        {previewMutation.isError && (
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {previewMutation.error instanceof Error
                ? previewMutation.error.message
                : 'Failed to preview request'}
            </p>
          </div>
        )}

        {testMutation.isError && (
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : 'Failed to test indexer'}
            </p>
          </div>
        )}

        {previewResult && (
          <div className="space-y-6">
            {/* Preview Results */}
            <div className="bg-blue-50 dark:bg-blue-900 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
                Request Preview
              </h2>
              <div className="space-y-2 text-blue-900 dark:text-blue-100">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={previewResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {previewResult.success ? 'Success' : 'Failed'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Message:</span> {previewResult.message}
                </p>
                <p>
                  <span className="font-medium">Method:</span> {previewResult.method}
                </p>
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  <span className={previewResult.usedRss ? 'text-blue-600 dark:text-blue-300 font-semibold' : ''}>
                    {previewResult.usedRss ? 'RSS Feed' : 'Search URL'}
                  </span>
                </p>
              </div>

              {previewResult.targetUrl && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Target URL
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded p-4 overflow-x-auto">
                    <a
                      href={previewResult.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline break-all"
                    >
                      {previewResult.targetUrl}
                    </a>
                  </div>
                </div>
              )}

              {previewResult.rssParams && Object.keys(previewResult.rssParams).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-2">
                    RSS Parameters
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded p-4">
                    <pre className="text-sm text-gray-900 dark:text-white">
                      {JSON.stringify(previewResult.rssParams, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {previewResult.searchParams && Object.keys(previewResult.searchParams).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Search Parameters
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded p-4">
                    <pre className="text-sm text-gray-900 dark:text-white">
                      {JSON.stringify(previewResult.searchParams, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {testResult && (
          <div className="space-y-6">
            {/* Test Results Summary */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Test Results</h2>
              <div className="space-y-2 text-gray-900 dark:text-white">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span
                    className={
                      testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {testResult.success ? 'Success' : 'Failed'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Message:</span> {testResult.message}
                </p>
                <p>
                  <span className="font-medium">Result Count:</span>{' '}
                  {testResult.resultCount}
                </p>
                <p>
                  <span className="font-medium">Status Code:</span>{' '}
                  {testResult.statusCode}
                </p>
                <p>
                  <span className="font-medium">Used Flaresolverr:</span>{' '}
                  {testResult.usedFlaresolverr ? 'Yes' : 'No'}
                </p>
                {testResult.usedRss !== undefined && (
                  <p>
                    <span className="font-medium">Used RSS Feed:</span>{' '}
                    <span className={testResult.usedRss ? 'text-blue-600 dark:text-blue-400' : ''}>
                      {testResult.usedRss ? 'Yes' : 'No (used search URL)'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Generated URL and Parameters */}
            {testResult.targetUrl && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Generated URL
                </h2>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 overflow-x-auto">
                  <a
                    href={testResult.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline break-all"
                  >
                    {testResult.targetUrl}
                  </a>
                </div>

                {testResult.rssParams && Object.keys(testResult.rssParams).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                      RSS Parameters
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <pre className="text-sm text-gray-900 dark:text-white">
                        {JSON.stringify(testResult.rssParams, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sample Results */}
            {testResult.sampleResults && testResult.sampleResults.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Sample Results
                </h2>
                <div className="space-y-4">
                  {testResult.sampleResults.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      {Object.entries(result).map(([key, value]) => (
                        <div key={key} className="mb-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {key}:
                          </span>{' '}
                          <span className="text-gray-900 dark:text-white">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw HTML */}
            {testResult.html && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Raw HTML
                </h2>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {testResult.html.substring(0, 5000)}
                    {testResult.html.length > 5000 && '...\n(truncated)'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
