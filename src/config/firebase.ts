import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'webrtc-react-nix.firebaseapp.com',
  projectId: 'webrtc-react-nix',
  storageBucket: 'webrtc-react-nix.firebasestorage.app',
  messagingSenderId: '652528953769',
  appId: '1:652528953769:web:fe134f960a42fc5ef97cb8',
  measurementId: 'G-HZ8GDX0GGG',
}

const app = initializeApp(firebaseConfig)
export const firestore = getFirestore(app)
export const analytics = getAnalytics(app)
