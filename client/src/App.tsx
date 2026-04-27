import { useEffect } from 'react'
import { socket } from './services/socket'

export const App = () => {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("User Connected", socket.id)
    })

    socket.on("disconnect", () => {
      console.log("User Disconnected")
    })

    // ❌ DO NOT disconnect here
    return () => {
      socket.off("connect")
      socket.off("disconnect")
    }
  }, [])

  return (
    <div>App</div>
  )
}

export default App