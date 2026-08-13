import { formatDistanceToNow } from 'date-fns';
import { Sparkles } from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useKudos } from '../../hooks/useKudos';

export default function KudosFeed() {
  const { kudosFeed, loadingKudos, isKudosError } = useKudos();

  if (loadingKudos) return <LoadingSpinner />;
  if (isKudosError) return <div className="text-red-500 text-sm">Failed to load feed.</div>;
  if (!kudosFeed || kudosFeed.length === 0) {
    return (
      <EmptyState 
        title="No recognition yet"
        description="Be the first to recognize a colleague for their hard work!"
        icon={Sparkles}
      />
    );
  }

  return (
    <div className="space-y-4">
      {kudosFeed.map((kudo) => (
        <div key={kudo.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {/* Sender Avatar */}
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold border-2 border-white dark:border-gray-800 relative z-10" title={kudo.from_user.name}>
                  {kudo.from_user.name.charAt(0)}
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-bold border-2 border-white dark:border-gray-800 relative z-0" title={kudo.to_user.name}>
                  {kudo.to_user.name.charAt(0)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  <span className="font-semibold">{kudo.from_user.name}</span> recognized <span className="font-semibold">{kudo.to_user.name}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(kudo.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {kudo.points_included > 0 && (
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm">
                +{kudo.points_included} pts
              </div>
            )}
          </div>
          <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
              "{kudo.message}"
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
