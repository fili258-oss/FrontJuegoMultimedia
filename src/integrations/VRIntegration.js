// src/integrations/VRIntegration.js

import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'

export default class VRIntegration {
  constructor({ renderer, scene, camera, modalManager, experience }) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.modalManager = modalManager
    this.experience = experience
    this.characters = []
    this.clock = new THREE.Clock()

    this.arrowHelper = null
    this._movePressedLastFrame = false

    this._initXR()
    this._setupControllers()
  }

  _initXR() {
    this.renderer.xr.enabled = true
    // Agregar botón VR de Three.js pero ocultarlo si no hay soporte
    const vrBtn = VRButton.createButton(this.renderer)
    document.body.appendChild(vrBtn)

    // Esperar a que el texto se establezca (puede tardar un frame)
    setTimeout(() => {
      if (vrBtn.innerText?.includes('NOT SUPPORTED')) {
        vrBtn.style.display = 'none'
      } else {
        // Opcional: ocultar también si tú controlas el acceso desde el menú circular
        vrBtn.style.display = 'none'
      }
    }, 100)


    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta()
      this._updateControllers(delta)
      if (this.updateCallback) this.updateCallback(delta)
      this.renderer.render(this.scene, this.camera)

    })
  }

  _setupControllers() {
    this.controller1 = this.renderer.xr.getController(0)
    this.controller2 = this.renderer.xr.getController(1)
    this.scene.add(this.controller1, this.controller2)

    const geo = new THREE.CylinderGeometry(0.005, 0.005, 0.1, 8)
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2

    this.controller1.add(mesh.clone())
    this.controller2.add(mesh.clone())
  }

  bindCharacter(character) {
    this.characters.push(character)
  }

  async toggleVR() {
    if (!navigator.xr) {
      this._showFallback('❌ WebXR no disponible en este navegador.')
      return
    }

    let supported = false
    try {
      supported = await navigator.xr.isSessionSupported('immersive-vr')
    } catch (err) {
      console.warn('Error comprobando soporte VR:', err)
    }

    if (!supported) {
      this._showFallback('🚫 VR inmersivo no soportado. Usa HTTPS o ngrok.')
      return
    }

    const session = this.renderer.xr.getSession()
    if (session) {
      try {
        await session.end()
      } catch (err) {
        console.error('Error al salir de VR:', err)
      }
    } else {
      try {
        const newSession = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['bounded-floor']
        })

        try {
          const ctx = Howler?.ctx
          if (ctx && ctx.state === 'suspended') {
            await ctx.resume()
            console.log('🔊 AudioContext reanudado dentro de VR')
          }
        } catch (err) {
          console.warn('⚠️ Falló al reanudar AudioContext:', err)
        }

        this.renderer.xr.setSession(newSession)

        // Alinear cámara con el robot
        if (this.camera && this.experience?.world?.robot?.group) {
          const pos = this.experience.world.robot.group.position
          this.camera.position.copy(pos).add(new THREE.Vector3(0, 1.6, 0))
          this.camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1.6, -1)))
          console.log('🎯 Cámara realineada con el robot')
        }

        const overlay = document.createElement('div')
        overlay.innerText = '✅ VR ACTIVADO'
        overlay.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: black;
          color: lime;
          padding: 20px;
          font-size: 24px;
          z-index: 99999;
        `
        document.body.appendChild(overlay)

        setTimeout(() => overlay.remove(), 3000)
        console.log('✅ Sesión VR iniciada correctamente')
      } catch (err) {
        console.error('No se pudo iniciar VR:', err)
        const msg = err.message.includes('secure')
          ? 'Las sesiones VR requieren un contexto seguro (HTTPS).'
          : 'Error al iniciar VR: ' + err.message
        this._showFallback('⚠️ ' + msg)
      }
    }
  }

  _showFallback(text) {
    const warning = document.createElement('div')
    warning.innerText = text
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.85);
      color: white;
      padding: 10px 20px;
      font-size: 16px;
      font-family: sans-serif;
      border-radius: 8px;
      z-index: 9999;
    `
    document.body.appendChild(warning)
    setTimeout(() => warning.remove(), 5000)
  }

  setUpdateCallback(fn) {
    this.updateCallback = fn
  }

  _updateControllers(delta) {
    const session = this.renderer.xr.getSession()
    if (!session) return

    for (const source of session.inputSources) {
      if (!source.gamepad || !source.handedness) continue

      const gamepad = source.gamepad
      const isPressed = gamepad.buttons[0]?.pressed

      if (isPressed) {
        const dir = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(this.camera.quaternion)
          .setY(0)
          .normalize()

        const speed = delta * 3

        // Mostrar flecha visual
        if (!this.arrowHelper) {
          this.arrowHelper = new THREE.ArrowHelper(
            dir.clone(),
            new THREE.Vector3(0, 0, 0),
            0.5,
            0x00ff00
          )
          this.camera.add(this.arrowHelper)
          this.arrowHelper.position.set(0, -0.2, -0.5)
        } else {
          this.arrowHelper.setDirection(dir.clone())
        }

        for (const c of this.characters) {
          if (typeof c.moveInDirection === 'function') {
            c.moveInDirection(dir, speed)
          }
        }

        this._movePressedLastFrame = true
      } else {
        if (this._movePressedLastFrame && this.arrowHelper) {
          this.camera.remove(this.arrowHelper)
          this.arrowHelper.geometry.dispose()
          this.arrowHelper.material.dispose()
          this.arrowHelper = null
        }
        this._movePressedLastFrame = false
      }
    }
  }
}
