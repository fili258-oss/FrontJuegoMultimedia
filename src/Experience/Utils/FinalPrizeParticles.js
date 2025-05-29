// FinalPrizeParticles.js (versión optimizada con THREE.Points)
import * as THREE from 'three'

export default class FinalPrizeParticles {
    constructor({ scene, targetPosition, sourcePosition, experience }) {
        this.scene = scene
        this.experience = experience
        this.clock = new THREE.Clock()

        this.count = 60
        this.angles = new Float32Array(this.count)
        this.radii = new Float32Array(this.count)
        this.positions = new Float32Array(this.count * 3)

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3
            const angle = Math.random() * Math.PI * 2
            const radius = 2 + Math.random() * 2
            const y = Math.random() * 2

            this.angles[i] = angle
            this.radii[i] = radius

            this.positions[i3 + 0] = sourcePosition.x + Math.cos(angle) * radius
            this.positions[i3 + 1] = sourcePosition.y + y
            this.positions[i3 + 2] = sourcePosition.z + Math.sin(angle) * radius
        }

        this.geometry = new THREE.BufferGeometry()
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

        const material = new THREE.PointsMaterial({
            size: 0.3,
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            depthWrite: false
        })

        this.points = new THREE.Points(this.geometry, material)
        this.scene.add(this.points)

        this.target = targetPosition.clone()
        this.experience.time.on('tick', this.update)

        // Eliminar luego de unos segundos
        setTimeout(() => this.dispose(), 8000)
    }

    update = () => {
        const delta = this.clock.getDelta()

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3

            this.angles[i] += 1.5 * delta // velocidad angular
            this.radii[i] *= 0.98 // espiral

            this.positions[i3 + 0] = this.target.x + Math.cos(this.angles[i]) * this.radii[i]
            this.positions[i3 + 2] = this.target.z + Math.sin(this.angles[i]) * this.radii[i]
            this.positions[i3 + 1] += 0.01 // subir lentamente
        }

        this.geometry.attributes.position.needsUpdate = true
    }

    dispose() {
        this.experience.time.off('tick', this.update)
        this.scene.remove(this.points)
        this.geometry.dispose()
        this.points.material.dispose()
    }
}