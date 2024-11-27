import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toast, toastConfig } from 'react-simple-toasts'
import { firestore } from '../../config/firebase'
import { pc } from '../../config/webrtc'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import HangupIcon from '../../assets/svg/hangup.svg?react'
import CopyIcon from '../../assets/svg/copy.svg?react'
import './Videos.css'
import 'react-simple-toasts/dist/style.css'

toastConfig({ theme: 'dark' })

export function Videos() {
  const { roomId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [webcamActive, setWebcamActive] = useState(false)
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)

  const setupSources = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    const remoteStream = new MediaStream()

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
    })

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    }

    if (localRef.current && remoteRef.current) {
      localRef.current.srcObject = localStream
      remoteRef.current.srcObject = remoteStream
    }

    setWebcamActive(true)

    if (location.pathname === '/create') {
      const callDoc = doc(collection(firestore, 'calls'))
      const offerCandidates = collection(callDoc, 'offerCandidates')
      const answerCandidates = collection(callDoc, 'answerCandidates')

      setJoinCode(callDoc.id)

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCandidates, event.candidate.toJSON())
        }
      }

      const offerDescription = await pc.createOffer()
      await pc.setLocalDescription(offerDescription)

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      }

      await setDoc(callDoc, { offer })

      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data()
        if (!pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer)
          pc.setRemoteDescription(answerDescription)
        }
      })

      onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data())
            pc.addIceCandidate(candidate)
          }
        })
      })
    } else if (location.pathname.includes('/join') && roomId) {
      const callDoc = doc(firestore, 'calls', roomId)
      const answerCandidates = collection(callDoc, 'answerCandidates')
      const offerCandidates = collection(callDoc, 'offerCandidates')

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidates, event.candidate.toJSON())
        }
      }

      const callSnapshot = await getDoc(callDoc)

      if (!callSnapshot.exists()) {
        navigate('/')
        toast(`No call with ID: ${roomId}`)
        return
      }

      const callData = callSnapshot.data()

      const offerDescription = callData.offer
      await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

      const answerDescription = await pc.createAnswer()
      await pc.setLocalDescription(answerDescription)

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      }

      await updateDoc(callDoc, { answer })

      onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data()
            pc.addIceCandidate(new RTCIceCandidate(data))
          }
        })
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected') {
        hangUp()
      }
    }
  }

  const hangUp = async () => {
    pc.close()

    if (roomId) {
      const roomRef = doc(firestore, 'calls', roomId)
      const answerCandidates = collection(roomRef, 'answerCandidates')
      const offerCandidates = collection(roomRef, 'offerCandidates')

      const answerSnapshot = await getDocs(answerCandidates)
      answerSnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref)
      })

      const offerSnapshot = await getDocs(offerCandidates)
      offerSnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref)
      })

      await deleteDoc(roomRef)
    }

    navigate('/')
  }

  return (
    <div className="videos">
      <video ref={localRef} autoPlay playsInline className="local" muted />
      <video ref={remoteRef} autoPlay playsInline className="remote" />

      <div className="buttonsContainer">
        <button
          onClick={hangUp}
          type="button"
          disabled={!webcamActive}
          className="hangup button"
          title="Hang up">
          <HangupIcon />
        </button>
        <button
          onClick={() => {
            const url = `${window.location.origin}/join/${joinCode}`
            navigator.clipboard.writeText(url)
            toast('Join URL copied to clipboard')
          }}
          type="button"
          className="copy button"
          title="Copy join URL">
          <CopyIcon />
        </button>
      </div>

      {!webcamActive && (
        <div className="modalContainer">
          <div className="modal">
            <h3>Turn on your camera and microphone to start the call</h3>
            <div className="container">
              <button
                onClick={() => navigate('/')}
                type="button"
                className="secondary">
                Cancel
              </button>
              <button onClick={setupSources} type="button">
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
