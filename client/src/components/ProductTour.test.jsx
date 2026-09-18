import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductTour from './ProductTour.jsx';
import { productTourSteps } from './product-tour-steps.js';

describe('first-account product tour', () => {
  it('presents all seven steps and advances through the guide', () => {
    const onNavigate = vi.fn();
    const onFinish = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<ProductTour active onNavigate={onNavigate} onFinish={onFinish} />);

    expect(screen.getByRole('heading', { name: 'Welcome to MedGuide AI' })).toBeInTheDocument();
    expect(container.querySelectorAll('.tour-dot')).toHaveLength(productTourSteps.length);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Describe what you are feeling' })).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith('symptom');
  });
});
