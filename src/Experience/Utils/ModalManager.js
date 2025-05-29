// src/Utils/ModalManager.js
export default class ModalManager {
  constructor({ container = document.body } = {}) {
    this.container = container
    this._createModal()
  }

  _createModal() {
    // Overlay
    this.overlay = document.createElement('div')
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    })
    this.container.appendChild(this.overlay)

    // Modal box
    this.box = document.createElement('div')
    Object.assign(this.box.style, {
      background: '#222',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '320px',
      textAlign: 'center',
      position: 'relative'
    })
    this.overlay.appendChild(this.box)

    // Icon
    this.icon = document.createElement('div')
    Object.assign(this.icon.style, {
      fontSize: '32px',
      marginBottom: '12px'
    })
    this.box.appendChild(this.icon)

    // Message text
    this.text = document.createElement('div')
    Object.assign(this.text.style, {
      fontSize: '16px',
      marginBottom: '16px',
      whiteSpace: 'pre-line'
    })
    this.box.appendChild(this.text)

    // Dynamic buttons container
    this.buttonsContainer = document.createElement('div')
    Object.assign(this.buttonsContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '12px'
    })
    this.box.appendChild(this.buttonsContainer)

    // Close button
    this.closeBtn = document.createElement('button')
    this.closeBtn.innerText = 'Cerrar'
    Object.assign(this.closeBtn.style, {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      background: '#00fff7',
      color: '#000',
      cursor: 'pointer'
    })
    this.closeBtn.onclick = () => this.hide()
    this.box.appendChild(this.closeBtn)
  }

  show({ icon = 'ℹ️', message = '', buttons = [] } = {}) {
    this.icon.innerText = icon
    this.text.innerText = message
    this.overlay.style.display = 'flex'

    // Limpiar botones anteriores
    this.buttonsContainer.innerHTML = ''

    // Agregar botones personalizados si se proporcionan
    if (Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach(btn => {
        const button = document.createElement('button')
        button.innerText = btn.text || 'Aceptar'
        button.onclick = () => {
          btn.onClick?.()
          this.hide()
        }
        Object.assign(button.style, {
          padding: '8px',
          background: '#00fff7',
          color: '#000',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        })
        this.buttonsContainer.appendChild(button)
      })
      this.closeBtn.style.display = 'none'
    } else {
      this.closeBtn.style.display = 'inline-block'
    }
  }

  hide() {
    this.overlay.style.display = 'none'
  }
}
