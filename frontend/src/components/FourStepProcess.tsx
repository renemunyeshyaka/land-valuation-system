import React from 'react';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Search / Upload',
    description: 'Enter parcel ID or drop title documents',
    icon: '📤',
    color: 'bg-blue-500'
  },
  {
    number: 2,
    title: 'Instant Valuation',
    description: 'Gazette formula + market adj. + history',
    icon: '📊',
    color: 'bg-green-500'
  },
  {
    number: 3,
    title: 'Connect & Match',
    description: 'Get introduced to serious buyers (diaspora, local)',
    icon: '🤝',
    color: 'bg-purple-500'
  },
  {
    number: 4,
    title: 'Secure Exchange',
    description: 'Title transfer support & payment escrow',
    icon: '🔒',
    color: 'bg-orange-500'
  }
];

interface FourStepProcessProps {
  currentStep?: number;
  onStepClick?: (stepNumber: number) => void;
}

export default function FourStepProcess({ currentStep = 0, onStepClick }: FourStepProcessProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Four Steps to Your Land Transaction
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <div
            key={step.number}
            onClick={() => onStepClick && onStepClick(step.number)}
            className={`relative ${
              onStepClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
            } ${
              currentStep === step.number ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 h-full flex flex-col">
              {/* Step Number Badge */}
              <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center text-white font-bold text-xl mb-4`}>
                {step.number}
              </div>
              
              {/* Icon */}
              <div className="text-4xl mb-4">{step.icon}</div>
              
              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {step.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-600 flex-grow">
                {step.description}
              </p>
              
              {/* Active Indicator */}
              {currentStep === step.number && (
                <div className="mt-4 text-blue-600 font-semibold text-sm">
                  ✓ Current Step
                </div>
              )}
            </div>
            
            {/* Arrow connector (except for last item) */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-400 text-2xl z-10">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
