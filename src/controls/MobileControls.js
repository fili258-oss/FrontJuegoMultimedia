// src/Experience/World/MobileControls.js
import * as THREE from 'three'

export default class MobileControls {
  constructor({ onUp, onDown, onLeft, onRight }) {
    this.onUp = onUp
    this.onDown = onDown
    this.onLeft = onLeft
    this.onRight = onRight

    this.active = false
    this.direction = { up: false, down: false, left: false, right: false }
    this.directionVector = new THREE.Vector2(0, 0)
    this.intensity = 0
    this.moveActive = false

    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (this.isTouchDevice) {
      this.createJoystick()
      this.createJumpButton()
    }
  }

  createJoystick() {
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '5vh',
      left: '5vw',
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      background: 'rgba(0,0,0,0.3)',
      zIndex: '9999',
      touchAction: 'none',
      userSelect: 'none'
    })

    this.stick = document.createElement('div')
    Object.assign(this.stick.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.8)',
      transform: 'translate(-50%, -50%)',
      transition: '0.1s',
      pointerEvents: 'none'
    })

    this.container.appendChild(this.stick)
    document.body.appendChild(this.container)

    this.center = { x: 0, y: 0 }
    this.radius = 60

    this.container.addEventListener('touchstart', this.onStart.bind(this))
    this.container.addEventListener('touchmove', this.onMove.bind(this))
    this.container.addEventListener('touchend', this.onEnd.bind(this))
  }

  createJumpButton() {
    this.jumpButton = document.createElement('button')
    this.jumpButton.innerText = '🆙'
    Object.assign(this.jumpButton.style, {
      position: 'fixed',
      top: '40vh',
      left: '5vw',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.5)',
      color: '#000',
      fontSize: '24px',
      fontWeight: 'bold',
      zIndex: 9999,
      border: 'none',
      boxShadow: '0 0 10px rgba(0,0,0,0.3)'
    })

    this.jumpButton.addEventListener('touchstart', () => {
      this.simulateSpacebar(true)
    })
    this.jumpButton.addEventListener('touchend', () => {
      this.simulateSpacebar(false)
    })

    document.body.appendChild(this.jumpButton)
  }

  onStart(e) {
    const rect = this.container.getBoundingClientRect()
    this.center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
    this.active = true
  }

  onMove(e) {
    if (!this.active) return
    const touch = e.touches[0]
    const dx = touch.clientX - this.center.x
    const dy = touch.clientY - this.center.y

    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), this.radius)
    const angle = Math.atan2(dy, dx)

    const offsetX = Math.cos(angle) * dist
    const offsetY = Math.sin(angle) * dist

    this.stick.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`

    const threshold = 20
    const dir = {
      up: dy < -threshold,
      down: dy > threshold,
      left: dx < -threshold,
      right: dx > threshold
    }

    const deadZone = 20
    if (dist < deadZone) {
      this.updateDirections({ up: false, down: false, left: false, right: false })
      this.intensity = 0
      return
    }

    this.intensity = Math.pow(dist / this.radius, 1.3) * 0.6

    const rawDir = new THREE.Vector2(dx, dy)
    if (rawDir.length() > 0) this.directionVector = rawDir.normalize()
    else this.directionVector.set(0, 0)

    this.updateDirections(dir)
  }

  onEnd(e) {
    this.active = false
    this.stick.style.transform = 'translate(-50%, -50%)'
    this.intensity = 0
    this.directionVector.set(0, 0)
    this.updateDirections({ up: false, down: false, left: false, right: false })
  }

  updateDirections(newDir) {
    if (this.direction.up !== newDir.up) this.onUp?.(newDir.up)
    if (this.direction.down !== newDir.down) this.onDown?.(newDir.down)
    if (this.direction.left !== newDir.left) this.onLeft?.(newDir.left)
    if (this.direction.right !== newDir.right) this.onRight?.(newDir.right)

    this.direction = newDir
  }

  simulateSpacebar(pressed) {
    if (!window.experience?.keyboard?.keys) return
    window.experience.keyboard.keys.space = pressed
  }

  destroy() {
    this.container?.remove()
    this.jumpButton?.remove()
  }
}
