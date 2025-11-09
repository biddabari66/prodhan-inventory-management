import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const StepperContext = React.createContext(null);

const useStepper = () => {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error('useStepper must be used within a Stepper component');
  }
  return context;
};

const Stepper = React.forwardRef(
  ({ initialStep = 0, steps, children, ...props }, ref) => {
    const [activeStep, setActiveStep] = React.useState(initialStep);
    const isLastStep = activeStep === steps.length - 1;
    const isFirstStep = activeStep === 0;

    const contextValue = { activeStep, isLastStep, isFirstStep, steps };

    return (
      <StepperContext.Provider value={contextValue}>
        <div ref={ref} className="flex w-full items-center justify-between" {...props}>
          {steps.map((step, index) => (
            <React.Fragment key={step.label}>
              <Step index={index} label={step.label || ''} isCompleted={activeStep > index} isActive={activeStep === index}>
                {children}
              </Step>
              {index < steps.length - 1 && <div className="h-0.5 w-full flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>
      </StepperContext.Provider>
    );
  }
);
Stepper.displayName = 'Stepper';

const Step = React.forwardRef(
  ({ index, isCompleted, isActive, children, ...props }, ref) => {
    return (
      <div ref={ref} className="flex flex-col items-center gap-2" {...props}>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
            isActive ? 'border-primary bg-primary text-primary-foreground' : '',
            isCompleted ? 'border-primary bg-primary text-primary-foreground' : '',
            !isActive && !isCompleted ? 'border-border bg-muted' : ''
          )}
        >
          {isCompleted ? <CheckIcon className="h-5 w-5" /> : <span>{index + 1}</span>}
        </div>
        <span className={cn('text-sm font-medium', isActive || isCompleted ? 'text-primary' : 'text-muted-foreground')}>
          {props.label}
        </span>
      </div>
    );
  }
);
Step.displayName = 'Step';

export { Stepper, Step, useStepper };