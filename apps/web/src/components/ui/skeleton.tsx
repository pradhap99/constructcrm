export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-1/4" />
      </div>
      <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2 mb-5" />
      <div className="h-1.5 bg-slate-100 rounded w-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-slate-50">
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-3/4" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-1/2" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-1/3" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-1/4" /></td>
    </tr>
  );
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-slate-100 rounded animate-pulse ${className}`} />;
}

export function SkeletonKPI() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="w-10 h-10 bg-slate-100 rounded-xl mb-3" />
      <div className="h-7 bg-slate-100 rounded w-2/3 mb-1.5" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
  );
}
