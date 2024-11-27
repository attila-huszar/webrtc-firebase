import { useState } from 'react'
import { useNavigate } from 'react-router'
import './Menu.css'

export function Menu() {
  const [joinCode, setJoinCode] = useState('')
  const navigate = useNavigate()

  return (
    <div className="home">
      <div className="create box">
        <button onClick={() => navigate('/create')}>Create Call</button>
      </div>
      <div className="answer box">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join with code"
        />
        <button onClick={() => navigate(`/join/${joinCode}`)}>Answer</button>
      </div>
    </div>
  )
}
