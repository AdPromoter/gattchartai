import { useEffect, useRef } from 'react'
import './ContextMenu.css'

function ContextMenu({ x, y, visible, items, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (visible) {
      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          onClose()
        }
      }
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [visible, onClose])

  if (!visible || !items || items.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
          onClick={() => {
            if (!item.disabled && item.onClick) {
              item.onClick()
              onClose()
            }
          }}
        >
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu

