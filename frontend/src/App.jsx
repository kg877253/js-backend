import { useState } from 'react'
import { useEffect } from 'react'
import axios from 'axios'

function App() {
  const [jokes, setjokes] = useState([])

  useEffect(() => {
    axios.get('/api/jokes')
      .then((res) => {
        setjokes(res.data)
      })
      .catch((err) => {
        console.log(err)
      })
  })

  return (
    <>
      <h1>AXIOS LEARNING V-3</h1>
      <h3>{jokes.length} jokes</h3>

      {jokes.map((joke) => {
        return (
          <div key={joke.id}>
            <p>{joke.joke}</p>
            <p>{joke.content}</p>
            <br />
          </div>
        )
      })}
    </>
  )
}

export default App
