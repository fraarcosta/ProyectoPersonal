// useWizard — React hook for multi-step forms with localStorage persistence.
// Wraps WizardEngine with React state and lifecycle management.
// 🔄 NEXT.JS: hook de React con localStorage → sólo puede ejecutarse en el cliente.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WizardEngine, WizardEngineConfig, WizardStoredState } from "./engine";

export interface UseWizardConfig<TData extends object> extends WizardEngineConfig<TData> {
  totalSteps:   number;
  onComplete?:  (data: TData) => void | Promise<void>;
  onCancel?:    () => void;
  onRehydrate?: (state: WizardStoredState<TData>) => void;
}

export interface WizardState<TData extends object> {
  step:           number;
  totalSteps:     number;
  data:           Partial<TData>;
  completedSteps: number[];
  isLoading:      boolean;
  isRehydrated:   boolean;
  wasMigrated:    boolean;
  stepNumber:     number;
  progress:       number;
  isLastStep:     boolean;
  isFirstStep:    boolean;
}

export interface WizardActions<TData extends object> {
  updateData: (updates: Partial<TData>) => void;
  next:       (stepData?: Partial<TData>) => void;
  back:       () => void;
  goToStep:   (step: number) => void;
  complete:   (finalData?: Partial<TData>) => Promise<void>;
  cancel:     () => void;
  reset:      () => void;
}

export function useWizard<TData extends object>(
  config: UseWizardConfig<TData>,
): WizardState<TData> & WizardActions<TData> {
  const engineRef = useRef<WizardEngine<TData>>(new WizardEngine<TData>(config));

  const [storedState, setStoredState] = useState<WizardStoredState<TData>>(
    () => engineRef.current.createInitial(),
  );
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRehydrated, setIsRehydrated] = useState(false);
  const [wasMigrated,  setWasMigrated]  = useState(false);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const engine = engineRef.current;
    WizardEngine.purgeExpired();
    const result = engine.load();
    if (result.found) {
      setStoredState(result.state);
      setIsRehydrated(true);
      setWasMigrated(result.migrated);
      config.onRehydrate?.(result.state);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = useCallback((updates: Partial<TData>) => {
    setStoredState(prev => engineRef.current.updateData(prev, updates));
  }, []);

  const next = useCallback((stepData?: Partial<TData>) => {
    setStoredState(prev => {
      const state = stepData ? engineRef.current.updateData(prev, stepData) : prev;
      return engineRef.current.advanceStep(state, Math.min(state.currentStep + 1, config.totalSteps - 1));
    });
  }, [config.totalSteps]);

  const back = useCallback(() => {
    setStoredState(prev => engineRef.current.backStep(prev, Math.max(prev.currentStep - 1, 0)));
  }, []);

  const goToStep = useCallback((step: number) => {
    setStoredState(prev => {
      if (step >= prev.currentStep && !prev.completedSteps.includes(step)) return prev;
      return engineRef.current.backStep(prev, Math.max(0, Math.min(step, config.totalSteps - 1)));
    });
  }, [config.totalSteps]);

  const complete = useCallback(async (finalData?: Partial<TData>) => {
    setStoredState(prev => {
      const state = finalData ? engineRef.current.updateData(prev, finalData) : prev;
      engineRef.current.complete();
      return state;
    });
    if (config.onComplete) await config.onComplete(storedState.data as TData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedState.data]);

  const cancel = useCallback(() => {
    engineRef.current.cancel();
    setStoredState(engineRef.current.createInitial());
    setIsRehydrated(false);
    config.onCancel?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    engineRef.current.cancel();
    setStoredState(engineRef.current.createInitial());
    setIsRehydrated(false);
    setWasMigrated(false);
  }, []);

  const step     = storedState.currentStep;
  const progress = config.totalSteps > 1 ? Math.round((step / (config.totalSteps - 1)) * 100) : 100;

  return {
    step, totalSteps: config.totalSteps, data: storedState.data,
    completedSteps: storedState.completedSteps, isLoading, isRehydrated, wasMigrated,
    stepNumber: step + 1, progress,
    isFirstStep: step === 0, isLastStep: step === config.totalSteps - 1,
    updateData, next, back, goToStep, complete, cancel, reset,
  };
}

export type { WizardStoredState, WizardEngineConfig } from "./engine";