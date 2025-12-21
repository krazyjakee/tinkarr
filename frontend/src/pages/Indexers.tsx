import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Layout } from '../components/common/Layout';

export const Indexers = () => {
  useEffect(() => {
    document.title = 'Indexers - Tinkarr';
  }, []);
  const queryClient = useQueryClient();

  const { data: indexers, isLoading } = useQuery({
    queryKey: ['indexers'],
    queryFn: () => apiClient.getIndexers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteIndexer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexers'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => apiClient.toggleIndexer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexers'] });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this indexer?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (id: number) => {
    toggleMutation.mutate(id);
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Indexers</h1>
          <Link
            to="/indexers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Indexer
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        ) : indexers && indexers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No indexers configured yet</p>
            <Link
              to="/indexers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add your first indexer
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {indexers?.map((indexer) => (
                <li key={indexer.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      {indexer.favicon && (
                        <img
                          src={indexer.favicon}
                          alt=""
                          className="h-10 w-10 mr-4"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {indexer.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {indexer.url}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span className="mr-4">
                            Type: {indexer.searchType || 'none'}
                          </span>
                          {indexer.requiresFlaresolverr && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              Flaresolverr
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <button
                        onClick={() => handleToggle(indexer.id)}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          indexer.enabled
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                        }`}
                      >
                        {indexer.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <Link
                        to={`/indexers/${indexer.id}/setup`}
                        className="px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                      >
                        Setup
                      </Link>
                      <Link
                        to={`/indexers/${indexer.id}/test`}
                        className="px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                      >
                        Test
                      </Link>
                      <Link
                        to={`/indexers/${indexer.id}/edit`}
                        className="px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(indexer.id)}
                        className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
};
