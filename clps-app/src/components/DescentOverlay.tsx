import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

interface DescentOverlayProps {
  onCancel?: () => void;
}

export default function DescentOverlay({ onCancel }: DescentOverlayProps) {
  const { overlayOpacity, phase, setPhase } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'descending') {
        setPhase('idle');
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, setPhase, onCancel]);

  if (overlayOpacity <= 0) return null;

  return (
    <div
      onClick={() => {
        if (phase === 'descending') {
          setPhase('idle');
          onCancel?.();
        }
      }}
      style={{ opacity: overlayOpacity }}
      className="fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-300"
    />
  );
}
