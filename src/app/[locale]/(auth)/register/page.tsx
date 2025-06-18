'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/providers/toast-provider'
import { Eye, EyeOff, Loader2, CheckCircle, Check, X } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { showSuccess, showError } = useToast()

  // Check username availability
  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setUsernameChecking(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', usernameToCheck)
        .single()

      if (error && error.code === 'PGRST116') {
        // No rows returned - username is available
        setUsernameAvailable(true)
      } else if (data) {
        // Username exists
        setUsernameAvailable(false)
      }
    } catch (err) {
      console.error('Error checking username:', err)
      setUsernameAvailable(null)
    } finally {
      setUsernameChecking(false)
    }
  }

  // Check email availability
  const checkEmailAvailability = async (emailToCheck: string) => {
    // Basic email validation first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailToCheck)) {
      setEmailAvailable(null)
      return
    }

    setEmailChecking(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', emailToCheck)
        .single()

      if (error && error.code === 'PGRST116') {
        // No rows returned - email is available
        setEmailAvailable(true)
      } else if (data) {
        // Email exists
        setEmailAvailable(false)
      }
    } catch (err) {
      console.error('Error checking email:', err)
      setEmailAvailable(null)
    } finally {
      setEmailChecking(false)
    }
  }

  // Debounced username check
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameAvailable(null)

    // Clear previous timeout
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        if (value.length >= 3) {
          checkUsernameAvailability(value)
        }
      }, 500) // Check after 500ms of no typing

      return () => clearTimeout(timeoutId)
    }
  }

  // Debounced email check
  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailAvailable(null)

    // Clear previous timeout
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailRegex.test(value)) {
          checkEmailAvailability(value)
        }
      }, 500) // Check after 500ms of no typing

      return () => clearTimeout(timeoutId)
    }
  }

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !username) {
      showError('Всички полета са задължителни', 'Грешка при валидация')
      return false
    }

    if (username.length < 3) {
      showError('Потребителското име трябва да е поне 3 символа', 'Грешка при валидация')
      return false
    }

    if (username.length > 20) {
      showError('Потребителското име не може да е повече от 20 символа', 'Грешка при валидация')
      return false
    }

    // Username can only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      showError('Потребителското име може да съдържа само букви, цифри и долна черта', 'Грешка при валидация')
      return false
    }

    if (usernameAvailable === false) {
      showError('Това потребителско име вече е заето. Моля изберете друго.', 'Грешка при валидация')
      return false
    }

    if (password.length < 6) {
      showError('Паролата трябва да е поне 6 символа', 'Грешка при валидация')
      return false
    }

    if (password !== confirmPassword) {
      showError('Паролите не съвпадат', 'Грешка при валидация')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showError('Моля въведете валиден имейл адрес', 'Грешка при валидация')
      return false
    }

    if (emailAvailable === false) {
      showError('Този имейл вече е регистриран. Моля използвайте друг имейл или влезте в профила си.', 'Грешка при валидация')
      return false
    }

    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            first_name: null,
            last_name: null,
            full_name: null,
          }
        }
      })

      if (error) {
        console.error('Registration error:', error)

        // Provide more user-friendly error messages
        let errorMessage = ''
        if (error.message.includes('User already registered')) {
          errorMessage = 'Този имейл вече е регистриран. Моля опитайте с друг имейл или влезте в профила си.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Моля въведете валиден имейл адрес.'
        } else if (error.message.includes('Password')) {
          errorMessage = 'Паролата трябва да е поне 6 символа.'
        } else if (error.message.includes('Database error') || error.message.includes('saving new user')) {
          errorMessage = 'Възникна грешка при създаването на акаунта. Моля опитайте отново или се свържете с поддръжката.'
        } else {
          errorMessage = `Грешка при регистрацията: ${error.message}`
        }

        showError(errorMessage, 'Грешка при регистрацията')
        return
      }

      if (data.user) {
        // Manual user creation as fallback if trigger fails
        try {
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              username: username, // Use the username from the form
              full_name: null,
              first_name: null,
              last_name: null,
              role: 'user',
              is_active: true
            })

          if (userError) {
            console.log('Manual user creation failed (trigger might have worked):', userError.message)
            // This is OK - it might mean the trigger already created the user
          }
        } catch (fallbackError) {
          console.log('Fallback user creation error:', fallbackError)
          // Continue anyway - the trigger might have worked
        }

        setSuccess(true)
        // Don't redirect immediately, show success message first
        setTimeout(() => {
          router.push('/bg/login')
        }, 3000)
      }
    } catch (err) {
      console.error('Unexpected registration error:', err)
      showError('Възникна неочаквана грешка при регистрацията', 'Системна грешка')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/bg/dashboard`
        }
      })

      if (error) {
        showError(error.message, 'Грешка при Google регистрация')
      }
    } catch (err) {
      showError('Възникна неочаквана грешка при Google регистрацията', 'Системна грешка')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Успешна регистрация!</CardTitle>
            <CardDescription className="text-center">
              Акаунтът ви е създаден успешно! Сега можете да влезете в профила си и да завършите профила си с допълнителна информация.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Ще бъдете пренасочени към страницата за вход след няколко секунди...
              </p>
              <Link href="/bg/login">
                <Button variant="outline">Към страницата за вход</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Регистрация</CardTitle>
          <CardDescription className="text-center">
            Създайте акаунт бързо и лесно. Допълнителната информация може да бъде добавена по-късно в профила.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Потребителско име *</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="ivan_petrov"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  disabled={loading}
                  className={
                    usernameAvailable === true ? 'border-green-500' :
                    usernameAvailable === false ? 'border-red-500' : ''
                  }
                />
                {username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : usernameAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="text-gray-500">
                  3-20 символа, само букви, цифри и долна черта
                </p>
                {username.length >= 3 && usernameAvailable === true && (
                  <p className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Потребителското име е свободно
                  </p>
                )}
                {username.length >= 3 && usernameAvailable === false && (
                  <p className="text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Потребителското име е заето
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Имейл *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  disabled={loading}
                  className={
                    emailAvailable === true ? 'border-green-500' :
                    emailAvailable === false ? 'border-red-500' : ''
                  }
                />
                {email.includes('@') && email.includes('.') && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : emailAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : emailAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {email.includes('@') && email.includes('.') && (
                <div className="text-xs space-y-1">
                  {emailAvailable === true && (
                    <p className="text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Имейлът е свободен
                    </p>
                  )}
                  {emailAvailable === false && (
                    <p className="text-red-600 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      Този имейл вече е регистриран
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Парола *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Поне 6 символа"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Потвърди паролата *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Въведете паролата отново"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>



            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                usernameAvailable === false ||
                emailAvailable === false ||
                usernameChecking ||
                emailChecking
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Регистриране...
                </>
              ) : usernameChecking || emailChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверяване...
                </>
              ) : (
                'Регистрирай се'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Или</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Регистрирай се с Google
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-600">Вече имате акаунт? </span>
            <Link href="/bg/login" className="text-blue-600 hover:underline">
              Влезте тук
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
