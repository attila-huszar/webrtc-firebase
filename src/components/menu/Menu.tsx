import { useState } from 'react'
import { useNavigate } from 'react-router'
import toast from 'react-simple-toasts'
import './Menu.css'

export function Menu() {
  const [joinCode, setJoinCode] = useState('')
  const navigate = useNavigate()

  return (
    <div className="home">
      <div className="create box">
        <button onClick={() => navigate('/create')} type="button">
          Create Call
        </button>
      </div>
      <div className="answer box">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join with code"
        />
        <button
          onClick={() => {
            if (!joinCode) {
              toast('Please enter a code')
              return
            }
            navigate(`/join/${joinCode}`)
          }}
          type="button">
          Answer
        </button>
      </div>
    </div>
  )
}
