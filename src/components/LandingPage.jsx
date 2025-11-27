import { useEffect, useState } from 'react'
import './LandingPage.css'

function LandingPage({ onGetStarted }) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className={`hero-section ${isVisible ? 'fade-in' : ''}`}>
          <h2 className="brand-title">Inner Room</h2>
          <p className="brand-subtitle">Gantt Chart AI Solution</p>
          <p className="brand-description">
            Manage projects the way your brain thinks best. Plan visually, break down with AI, align in Gantt—all in one clear flow.
            <br />
            No clutter, no rigid setup, just natural progress that turns ideas into impact.
          </p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={onGetStarted}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage

