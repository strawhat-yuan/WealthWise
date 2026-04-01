import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PortfolioProvider } from './context/PortfolioContext';

export default function App() {
  return (
    <PortfolioProvider>
      <RouterProvider router={router} />
    </PortfolioProvider>
  );
}