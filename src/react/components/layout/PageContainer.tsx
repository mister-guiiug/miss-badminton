import type { ReactNode } from 'react';

type Width = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const WIDTH_CLASS: Record<Width, string> = {
  sm: 'max-w-md md:max-w-lg',
  md: 'max-w-lg md:max-w-xl',
  lg: 'max-w-lg md:max-w-2xl lg:max-w-3xl',
  xl: 'max-w-xl md:max-w-3xl lg:max-w-4xl',
  '2xl': 'max-w-2xl md:max-w-4xl lg:max-w-5xl',
};

interface PageContainerProps {
  children: ReactNode;
  width?: Width;
  className?: string;
}

/**
 * Wrapper standard pour les vues "feuilles" (pages plein écran avec scroll).
 * Padding fluide, marges sûres pour notch/home bar iOS, largeur progressive
 * pour téléphone → tablette → grand écran.
 */
export function PageContainer({
  children,
  width = 'lg',
  className = '',
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full ${WIDTH_CLASS[width]} space-y-6 ${className}`}
      style={{
        paddingInlineStart: 'max(env(safe-area-inset-left), 1rem)',
        paddingInlineEnd: 'max(env(safe-area-inset-right), 1rem)',
        // Min 4.5rem (72 px) sur mobile : le bouton menu burger fait 12 + 44
        // = 56 px de haut, on garde 16 px de marge sous lui.
        paddingBlockStart:
          'calc(env(safe-area-inset-top, 0px) + clamp(4.5rem, 10vw, 5rem))',
        paddingBlockEnd:
          'calc(env(safe-area-inset-bottom, 0px) + clamp(2rem, 6vw, 3rem))',
      }}
    >
      {children}
    </div>
  );
}
