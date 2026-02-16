import { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { generateDemoData, validateDemoData } from '../utils/demoDataGenerator'
import { toast } from 'sonner'
import Icon from './ui/Icon'
import { Button } from './ui/Button'

interface DemoDataButtonProps {
  onDataGenerated?: () => void
  className?: string
}

function DemoDataButton({ onDataGenerated, className = '' }: DemoDataButtonProps) {
  const [user, loading] = useAuthState(auth)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [hideButton, setHideButton] = useState(false)

  const handleGenerateDemoData = async () => {
    if (!user) {
      toast.error('Please sign in to generate demo data')
      return
    }

    setIsGenerating(true)

    try {
      // Generate demo data
      const demoData = generateDemoData()

      // Validate the generated data
      if (!validateDemoData(demoData)) {
        throw new Error('Generated demo data is invalid')
      }

      // Batch insert applications to Firestore
      const batchPromises = demoData.map(async (application) => {
        const docData = {
          ...application,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        return addDoc(collection(db, `users/${user.uid}/applications`), docData)
      })

      // Wait for all insertions to complete
      await Promise.all(batchPromises)

      // Success feedback
      toast.success('Demo data generated successfully! 30 sample applications have been added.')

      // Hide button after successful generation
      setHideButton(true)

      // Call callback if provided
      onDataGenerated?.()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error generating demo data:', error)
      toast.error(`Failed to generate demo data: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
      setShowConfirm(false)
    }
  }

  const handleConfirm = () => {
    setShowConfirm(true)
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  if (loading) return null

  if (hideButton) return null

  return (
    <>
      <Button
        onClick={handleConfirm}
        disabled={isGenerating}
        variant="primary"
        className={`w-full sm:w-auto shadow-lg shadow-primary-500/20 ${className}`}
      >
        <Icon name="add" size={18} />
        Generate Demo Data
      </Button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up border border-zinc-200 dark:border-zinc-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="add" size={32} className="text-primary-600" />
              </div>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Generate Demo Data
              </h3>

              <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
                This will add 30 realistic sample applications to your account for analytics
                testing. The data includes various companies, roles, and application statuses to
                help you explore KRISIS features.
              </p>

              <div className="text-xs text-zinc-500 mb-6 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-left">
                <strong>Note:</strong> This action will permanently add data to your account. You
                can delete individual applications later if needed.
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCancel}
                  variant="secondary"
                  className="flex-1"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateDemoData}
                  disabled={isGenerating}
                  variant="primary"
                  className="flex-1"
                >
                  {isGenerating ? 'Generating...' : 'Generate Data'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DemoDataButton
