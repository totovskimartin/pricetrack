'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { getUserDisplayName } from '@/lib/user-utils'

interface UserLinkProps {
  user: any
  className?: string
  showAvatar?: boolean
  avatarSize?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export function UserLink({ 
  user, 
  className = '', 
  showAvatar = false, 
  avatarSize = 'sm',
  children 
}: UserLinkProps) {
  if (!user) {
    return (
      <span className={`text-gray-500 ${className}`}>
        {children || 'Анонимен потребител'}
      </span>
    )
  }

  const displayName = getUserDisplayName(user)
  const username = user.username || user.user_metadata?.username

  // If we don't have a username, just show the display name without link
  if (!username) {
    return (
      <span className={`text-gray-700 ${className}`}>
        {children || displayName}
      </span>
    )
  }

  const avatarSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Link 
      href={`/bg/profile/${username}`}
      className={`inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:underline transition-colors ${className}`}
    >
      {showAvatar && (
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className={`${avatarSizeClasses[avatarSize]} rounded-full object-cover border`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${avatarSizeClasses[avatarSize]} bg-blue-100 rounded-full flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
            <User className={`${avatarSize === 'sm' ? 'h-2 w-2' : avatarSize === 'md' ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
          </div>
        </div>
      )}
      <span>{children || `@${username}`}</span>
    </Link>
  )
}

// Utility component for displaying user with avatar
export function UserAvatar({ 
  user, 
  size = 'md',
  showName = true,
  className = ''
}: {
  user: any
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}) {
  if (!user) return null

  const displayName = getUserDisplayName(user)
  const username = user.username || user.user_metadata?.username

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className={`${sizeClasses[size]} rounded-full object-cover border`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`${sizeClasses[size]} bg-blue-100 rounded-full flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`}>
          <User className={`${iconSizes[size]} text-blue-600`} />
        </div>
      </div>
      {showName && (
        <div className="min-w-0 flex-1">
          {username ? (
            <UserLink user={user} className="text-sm font-medium">
              @{username}
            </UserLink>
          ) : (
            <span className="text-sm font-medium text-gray-700">{displayName}</span>
          )}
        </div>
      )}
    </div>
  )
}
