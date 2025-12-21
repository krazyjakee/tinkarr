import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';

export const IndexerSetup = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    document.title = 'Setup Instructions - Tinkarr';
    // Get the base URL from the current window location
    setBaseUrl(`${window.location.protocol}//${window.location.host}`);
  }, []);

  const { data: indexer, isLoading: indexerLoading } = useQuery({
    queryKey: ['indexer', id],
    queryFn: () => apiClient.getIndexer(Number(id)),
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiClient.getMe(),
  });

  const torznabUrl = `${baseUrl}/api/torznab/${id}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (indexerLoading || userLoading) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!indexer || !user) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <div className="text-lg text-red-600 dark:text-red-400">Indexer not found</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Link
            to="/indexers"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium"
          >
            &larr; Back to Indexers
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Setup Instructions</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{indexer.title}</p>
        </div>

        <div className="space-y-6">
          {/* Connection Details */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Connection Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Torznab URL
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 block px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-gray-900 dark:text-white">
                    {torznabUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(torznabUrl, 'url')}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                  >
                    {copied === 'url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 block px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-gray-900 dark:text-white">
                    {user.apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(user.apiKey, 'apikey')}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                  >
                    {copied === 'apikey' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You can regenerate your API key in Settings if needed
                </p>
              </div>
            </div>
          </div>

          {/* *arr Setup */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              *arr Setup
            </h2>

            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium">To add this indexer to *arr:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Go to Settings &rarr; Indexers</li>
                <li>Click the "+" button to add a new indexer</li>
                <li>Select "Torznab" &rarr; "Custom"</li>
                <li>Enter the following details:</li>
              </ol>

              <div className="ml-6 mt-3 space-y-2">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-medium">Name:</span>
                    <span>{indexer.title}</span>
                    <span className="font-medium">URL:</span>
                    <code className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                      {torznabUrl}
                    </code>
                    <span className="font-medium">API Key:</span>
                    <code className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                      {user.apiKey}
                    </code>
                  </div>
                </div>
              </div>

              <ol start={5} className="list-decimal list-inside space-y-2 ml-2 mt-3">
                <li>Click "Test" to verify the connection</li>
                <li>Click "Save" to add the indexer</li>
              </ol>
            </div>
          </div>

          {/* API Example */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              API Usage Example
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Test the connection with curl:
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-md overflow-x-auto text-xs">
                    <code>
{`curl "${torznabUrl}?t=caps&apikey=${user.apiKey}"`}
                    </code>
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl "${torznabUrl}?t=caps&apikey=${user.apiKey}"`,
                        'curl'
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-500"
                  >
                    {copied === 'curl' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Search for content:
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-md overflow-x-auto text-xs">
                    <code>
{`curl "${torznabUrl}?t=search&q=ubuntu&apikey=${user.apiKey}"`}
                    </code>
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl "${torznabUrl}?t=search&q=ubuntu&apikey=${user.apiKey}"`,
                        'search-curl'
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-700 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-500"
                  >
                    {copied === 'search-curl' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Query Types */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Supported Query Types
            </h2>

            <div className="space-y-3">
              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-medium text-gray-900 dark:text-white">caps</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Returns the capabilities of this indexer
                </p>
                <code className="text-xs text-gray-500 dark:text-gray-400">?t=caps</code>
              </div>

              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-medium text-gray-900 dark:text-white">search</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  General search query
                </p>
                <code className="text-xs text-gray-500 dark:text-gray-400">?t=search&q=query</code>
              </div>

              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-medium text-gray-900 dark:text-white">tvsearch</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  TV show search with season/episode
                </p>
                <code className="text-xs text-gray-500 dark:text-gray-400">
                  ?t=tvsearch&q=show&season=1&ep=1
                </code>
              </div>

              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-medium text-gray-900 dark:text-white">movie</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Movie search with optional IMDB ID
                </p>
                <code className="text-xs text-gray-500 dark:text-gray-400">
                  ?t=movie&q=movie&imdbid=tt1234567
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
