'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Upload, 
  User, 
  Crop as CropIcon, 
  Save, 
  X, 
  Loader2,
  AlertCircle,
  Camera
} from 'lucide-react'
import 'react-image-crop/dist/ReactCrop.css'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarChange: (avatarUrl: string | null) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  disabled = false,
  size = 'lg'
}: AvatarUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Моля, изберете изображение (JPG, PNG, GIF, etc.)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Изображението е твърде голямо. Максимален размер: 5MB')
      return
    }

    setSelectedFile(file)

    // Create image URL for cropping
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setImageSrc(imageUrl)
      setIsModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    
    // Create a square crop in the center
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        1, // aspect ratio 1:1 for square
        width,
        height
      ),
      width,
      height
    )
    
    setCrop(crop)
  }, [])

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Set canvas size to desired output size (300x300 for avatars)
    const outputSize = 300
    canvas.width = outputSize
    canvas.height = outputSize

    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    )

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })
  }, [completedCrop])

  const handleSaveCrop = async () => {
    if (!selectedFile || !completedCrop) return

    setUploading(true)
    setError('')

    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg()
      if (!croppedBlob) {
        setError('Възникна грешка при обработката на изображението')
        return
      }

      // Create form data with cropped image
      const formData = new FormData()
      const croppedFile = new File([croppedBlob], `avatar-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      })
      formData.append('file', croppedFile)
      formData.append('folder', 'avatars') // Specify avatars folder

      // Upload via API route
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Възникна грешка при качването')
        return
      }

      // Update avatar URL
      onAvatarChange(result.publicUrl)
      
      // Close modal and reset state
      setIsModalOpen(false)
      resetState()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setError('Възникна неочаквана грешка при качването')
    } finally {
      setUploading(false)
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setImageSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = () => {
    onAvatarChange(null)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Label>Профилна снимка</Label>
      
      {/* Current Avatar Display */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`${sizeClasses[size]} relative group rounded-full overflow-hidden self-center sm:self-start`}>
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Профилна снимка"
              className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 shadow-sm`}
              style={{ borderRadius: '50%' }}
            />
          ) : (
            <div className={`${sizeClasses[size]} bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200`}>
              <User className={`${iconSizes[size]} text-gray-400`} />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
               onClick={openFileDialog}
               style={{ borderRadius: '50%' }}>
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex flex-col space-y-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {currentAvatarUrl ? 'Смени снимката' : 'Качи снимка'}
          </Button>

          {currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={disabled}
              className="text-red-600 hover:text-red-700 w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Премахни
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <p className="text-xs text-gray-500">
        Препоръчителен размер: квадратно изображение, минимум 300x300 пиксела. Максимален размер: 5MB.
      </p>

      {/* Cropping Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <CropIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Редактирай профилната снимка</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              Изберете областта от изображението, която искате да използвате като профилна снимка.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {imageSrc && (
              <div className="flex justify-center overflow-hidden">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-w-full max-h-64 sm:max-h-96"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-64 sm:max-h-96 object-contain"
                  />
                </ReactCrop>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetState()
              }}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              Отказ
            </Button>
            <Button
              onClick={handleSaveCrop}
              disabled={uploading || !completedCrop}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Качване...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Запази снимката
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
