import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';

export const IndexerTest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [useFlaresolverr, setUseFlaresolverr] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const { data: indexer } = useQuery({
    queryKey: ['indexer', id],
    queryFn: () => apiClient.getIndexer(Number(id)),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      apiClient.testIndexer(Number(id), { query, useFlaresolverr }),
    onSuccess: (data) => {
      setTestResult(data);
    },
  });

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    testMutation.mutate();
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <button
            onClick={() => navigate('/indexers')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Indexers
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Test Indexer: {indexer?.title}
          </h1>
        </div>

        <form onSubmit={handleTest} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-gray-700">
                Search Query
              </label>
              <input
                type="text"
                name="query"
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search query"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="useFlaresolverr"
                id="useFlaresolverr"
                checked={useFlaresolverr}
                onChange={(e) => setUseFlaresolverr(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="useFlaresolverr" className="ml-2 block text-sm text-gray-900">
                Use Flaresolverr
              </label>
            </div>

            <button
              type="submit"
              disabled={testMutation.isPending}
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {testMutation.isPending ? 'Testing...' : 'Test Indexer'}
            </button>
          </div>
        </form>

        {testMutation.isError && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : 'Failed to test indexer'}
            </p>
          </div>
        )}

        {testResult && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span
                    className={
                      testResult.success ? 'text-green-600' : 'text-red-600'
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
              </div>
            </div>

            {testResult.sampleResults && testResult.sampleResults.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Sample Results
                </h2>
                <div className="space-y-4">
                  {testResult.sampleResults.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      {Object.entries(result).map(([key, value]) => (
                        <div key={key} className="mb-2">
                          <span className="font-medium text-gray-700">
                            {key}:
                          </span>{' '}
                          <span className="text-gray-900">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResult.html && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Raw HTML
                </h2>
                <div className="bg-gray-50 rounded p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap">
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
