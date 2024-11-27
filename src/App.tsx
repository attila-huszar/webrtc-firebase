import React, { useRef, useState } from 'react'
import { firestore } from './config/firebase'
import { pc } from './config/webrtc'
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
import HangupIcon from './assets/svg/hangup.svg?react'
import MoreIcon from './assets/svg/more-vertical.svg?react'
import CopyIcon from './assets/svg/copy.svg?react'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [joinCode, setJoinCode] = useState('')

  return (
    <div className="app">
      {currentPage === 'home' ? (
        <Menu
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          setPage={setCurrentPage}
        />
      ) : (
        <Videos mode={currentPage} callId={joinCode} setPage={setCurrentPage} />
      )}
    </div>
  )
}

function Menu({
  joinCode,
  setJoinCode,
  setPage,
}: {
  joinCode: string
  setJoinCode: React.Dispatch<React.SetStateAction<string>>
  setPage: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <div className="home">
      <div className="create box">
        <button onClick={() => setPage('create')}>Create Call</button>
      </div>

      <div className="answer box">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join with code"
        />
        <button onClick={() => setPage('join')}>Answer</button>
      </div>
    </div>
  )
}

function Videos({
  mode,
  callId,
  setPage,
}: {
  mode: string
  callId: string
  setPage: React.Dispatch<React.SetStateAction<string>>
}) {
  const [webcamActive, setWebcamActive] = useState(false)
  const [roomId, setRoomId] = useState(callId)

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

    if (mode === 'create') {
      const callDoc = doc(collection(firestore, 'calls'))
      const offerCandidates = collection(callDoc, 'offerCandidates')
      const answerCandidates = collection(callDoc, 'answerCandidates')

      setRoomId(callDoc.id)

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
    } else if (mode === 'join') {
      const callDoc = doc(firestore, 'calls', callId)

      const answerCandidates = collection(callDoc, 'answerCandidates')
      const offerCandidates = collection(callDoc, 'offerCandidates')

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidates, event.candidate.toJSON())
        }
      }

      const callSnapshot = await getDoc(callDoc)
      const callData = callSnapshot.data()

      const offerDescription = callData?.offer
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

    window.location.reload()
  }

  return (
    <div className="videos">
      <video ref={localRef} autoPlay playsInline className="local" muted />
      <video ref={remoteRef} autoPlay playsInline className="remote" />

      <div className="buttonsContainer">
        <button
          onClick={hangUp}
          disabled={!webcamActive}
          className="hangup button">
          <HangupIcon />
        </button>
        <div tabIndex={0} role="button" className="more button">
          <MoreIcon />
          <div className="popover">
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId)
              }}>
              <CopyIcon /> Copy joining code
            </button>
          </div>
        </div>
      </div>

      {!webcamActive && (
        <div className="modalContainer">
          <div className="modal">
            <h3>Turn on your camera and microphone and start the call</h3>
            <div className="container">
              <button onClick={() => setPage('home')} className="secondary">
                Cancel
              </button>
              <button onClick={setupSources}>Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
