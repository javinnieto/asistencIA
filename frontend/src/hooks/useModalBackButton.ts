import { useEffect } from 'react';

/**
 * useModalBackButton
 *
 * Cuando un modal está abierto, empuja un estado extra al historial del navegador.
 * Si el usuario aprieta el botón "atrás" (navegador o sistema), el modal se cierra
 * en lugar de navegar a la sección anterior.
 *
 * Uso:
 *   useModalBackButton(isOpen, onClose);
 *
 * @param isOpen  - boolean que indica si el modal está abierto
 * @param onClose - función que cierra el modal
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    // Empujamos un estado "vacío" para que el botón atrás tenga algo que consumir
    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
