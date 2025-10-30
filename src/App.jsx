import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Header from './components/Header'
import ListingDetail from './components/ListingDetail'
import Colors from './theme/colors'

function App() {
  const [count, setCount] = useState(0)
  const [dataListing, setDataListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams(window.location.search)
        const id = params.get('id') || '10317'
        const res = await fetch(`/api/api/v1/listing/${id}`)
        if (!res.ok) throw new Error('İstek başarısız')
        const json = await res.json()
        if (!cancelled) setDataListing(json)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <Header
        leftIcon
        leftAction={() => alert('Left pressed')}
        rightType="icon"
        rightHeartIcon
        rightHeartAction={() => alert('Heart')}
        heartStatus={count % 2 === 0}
        rightShareIcon
        rightShareAction={() => alert('Share')}
      />
      <div style={{ padding: '0 0 24px 0', background: Colors.background }}>
        {loading ? (
          <div style={{ padding: 16 }}>Yükleniyor...</div>
        ) : error ? (
          <div style={{ padding: 16, color: 'red' }}>{error}</div>
        ) : (
          <ListingDetail dataListing={dataListing} />
        )}
      </div>
    </>
  )
}

export default App
