import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

// Product Card Skeleton
function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white/60 backdrop-blur-sm border border-white/20 rounded-lg p-5 space-y-3", className)}>
      <div className="flex items-start space-x-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}

// Activity Feed Skeleton
function ActivityFeedSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start space-x-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// News Card Skeleton
function NewsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {[...Array(2)].map((_, i) => (
        <div key={i} className="border-l-4 border-gray-200 pl-4 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  )
}

// Search Results Skeleton
function SearchResultsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-0", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100 last:border-b-0">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Stats Card Skeleton
function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white/60 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export { 
  Skeleton, 
  ProductCardSkeleton, 
  ActivityFeedSkeleton, 
  NewsCardSkeleton, 
  SearchResultsSkeleton,
  StatsCardSkeleton 
}
