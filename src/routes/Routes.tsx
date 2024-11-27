import {
  RouterProvider,
  createBrowserRouter,
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
        element: <Menu />,
      },
    ],
  },
]

const router = createBrowserRouter(routes)

export const Routes: React.FC = () => {
  return <RouterProvider router={router} />
}
