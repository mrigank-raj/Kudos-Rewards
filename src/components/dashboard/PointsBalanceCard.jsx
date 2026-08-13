import { Zap, TrendingUp } from 'lucide-react';

export default function PointsBalanceCard({ balance = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-accent p-6 sm:p-8 text-white shadow-lg">
      {/* Decorative blobs */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-medium text-indigo-100">Available Points</span>
        </div>

        <p className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2">
          {balance.toLocaleString()}
        </p>

        <div className="flex items-center gap-1.5 mt-3 text-indigo-200 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>Ready to redeem</span>
        </div>
      </div>
    </div>
  );
}
