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
          <h1 className="hero-title">
            <span className="title-line">Project Management</span>
            <span className="title-line">The Light Way</span>
          </h1>
          <p className="hero-subtitle">
            No complex setup. No switching tools. Plan, track, and manage with AI-powered Gantt charts.
            <br />
            Managing projects, just the way it should be.
          </p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={onGetStarted}>
              Get Started Free
            </button>
            <button className="cta-secondary" onClick={onGetStarted}>
              Request a Demo
            </button>
          </div>
          <p className="hero-note">No credit card required · Works on web, desktop, and mobile</p>
        </div>

        <div className={`features-section ${isVisible ? 'slide-up' : ''}`}>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Create with AI</h3>
            <p>Turn project ideas into organized, actionable task breakdowns instantly</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Gantt Chart View</h3>
            <p>Visualize timelines, track dependencies, and manage progress with clarity</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Excel-like Interface</h3>
            <p>Plan, assign tasks, and adjust progress efficiently in one place</p>
          </div>
        </div>

        <div className={`tagline-section ${isVisible ? 'fade-in-delay' : ''}`}>
          <h2>Inner Room</h2>
          <p className="tagline">Gantt Chart AI Solution</p>
          <p className="tagline-subtitle">
            Manage projects the way your brain thinks best. Plan visually, break down with AI, align in Gantt—all in one clear flow.
            <br />
            No clutter, no rigid setup, just natural progress that turns ideas into impact.
          </p>
        </div>
      </div>

      <div className="landing-footer">
        <p>Trusted by teams worldwide</p>
      </div>
    </div>
  )
}

export default LandingPage

