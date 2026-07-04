import { AppShell } from './src/navigation/AppShell';
import { AppProviders } from './src/app/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
