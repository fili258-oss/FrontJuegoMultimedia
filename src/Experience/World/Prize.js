import * as THREE from 'three'

export default class Prize {
    // En Prize.js
    constructor({ model, position, scene, role = 'default' }) {
        this.scene = scene
        this.collected = false
        this.role = role // 🟡 Guardar el rol

        // 📌 Crear el pivot (grupo contenedor)
        this.pivot = new THREE.Group()
        this.pivot.position.copy(position)

        // ✅ Clonar el modelo completo
        this.model = model.clone()

        // 🧠 Buscar el primer hijo con geometría
        const visual = this.model.children[0] || this.model

        // 🛠️ Resetear la posición del visual para que herede la del pivot
        visual.position.set(0, 0, 0)
        visual.rotation.set(0, 0, 0)
        visual.scale.set(1, 1, 1)

        // Agregar el visual al pivot
        this.pivot.add(visual)

        // 🔍 Ayudante visual de ejes para verificar ubicación real
        const helper = new THREE.AxesHelper(0.5)
        this.pivot.add(helper)

        // 👻 Mostrar u ocultar según el rol
        this.pivot.visible = role !== 'finalPrize'

        // ➕ Agregar el pivot (no el modelo) a la escena
        this.scene.add(this.pivot)

        // 🪪 Debug
        console.log(`🎯 Premio en: (${position.x}, ${position.y}, ${position.z}) [role: ${this.role}]`)
    }

    update(delta) {
        if (this.collected) return
        this.pivot.rotation.y += delta * 1.5
    }

    collect() {
        this.collected = true
        this.scene.remove(this.pivot)
    }
}
