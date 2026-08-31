import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseTestOptions } from '@mister-guiiug/dev-wpa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `virtual:pwa-register` n'existe QUE dans un build servi par
      // vite-plugin-pwa : hors de là, Vite refuse de transformer le module qui
      // l'importe, et le test échoue à la RÉSOLUTION — avant d'avoir rien
      // éprouvé. Un `vi.mock` n'y peut rien (il agit trop tard) : il faut un
      // vrai fichier, désigné ici.
      //
      // Le double du socle est PILOTABLE (`swStub.needRefresh()`), là où un
      // stub muet ne prouverait que le montage d'un composant, jamais qu'un
      // bandeau peut s'afficher.
      'virtual:pwa-register': fileURLToPath(
        import.meta
          .resolve('@mister-guiiug/dev-wpa-config/testing/pwa-register')
      ),
    },
  },
  test: baseTestOptions,
});
