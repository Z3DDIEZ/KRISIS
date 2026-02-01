import { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { generateDemoData, validateDemoData } from '../utils/demoDataGenerator'
import { toast } from 'sonner'
import Icon from './ui/Icon'

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
          updatedAt: serverTimestamp()
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
      <button
        onClick={handleConfirm}
        disabled={isGenerating}
        className={`relative overflow-hidden bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${className}`}
      >
        <div className="flex items-center gap-3">
          <Icon name="add" size={20} />
          <span>Generate Demo Data</span>
        </div>

        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-500 opacity-0 hover:opacity-20 transition-opacity duration-200" />
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="add" size={32} className="text-amber-600" />
              </div>

              <h3 className="text-xl font-bold text-primary mb-2">Generate Demo Data</h3>

              <p className="text-secondary mb-6 leading-relaxed">
                This will add 30 realistic sample applications to your account for analytics testing.
                The data includes various companies, roles, and application statuses to help you explore KRISIS features.
              </p>

              <div className="text-sm text-muted mb-6 p-3 bg-background-light rounded-lg">
                <strong>Note:</strong> This action will permanently add data to your account.
                You can delete individual applications later if needed.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 btn btn-secondary"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDemoData}
                  disabled={isGenerating}
                  className="flex-1 btn btn-orange"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate Data'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DemoDataButton