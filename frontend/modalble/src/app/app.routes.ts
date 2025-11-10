import { Routes, PreloadAllModules } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  {
    path: 'chat',
    loadComponent: () => import('./chat/chat.page').then(m => m.ChatPage),
  },
  { path: '**', redirectTo: 'chat' },
];

export const routerConfig = { preloadingStrategy: PreloadAllModules } as const;
