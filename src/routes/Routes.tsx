import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
} from 'react-router'
import { Menu, Videos } from '../components'

const routes: RouteObject[] = [
  {
    path: '/',
    children: [
      {
        index: true,
        element: <Menu />,
      },
      {
        path: '/create',
        element: <Videos />,
      },
      {
        path: '/join/:roomId',
        element: <Videos />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]

const router = createBrowserRouter(routes)

export const Routes: React.FC = () => {
  return <RouterProvider router={router} />
}
