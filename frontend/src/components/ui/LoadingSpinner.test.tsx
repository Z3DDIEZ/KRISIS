/// <reference types="vitest" />
import { render, screen } from '@testing-library/react'
import { expect } from 'vitest'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-8', 'h-8') // md size by default
  })

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toHaveClass('w-4', 'h-4')
  })

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toHaveClass('w-12', 'h-12')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toHaveClass('custom-class')
  })

  it('has animation classes', () => {
    render(<LoadingSpinner data-testid="spinner" />)
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-gray-300', 'border-t-blue-600')
  })
})