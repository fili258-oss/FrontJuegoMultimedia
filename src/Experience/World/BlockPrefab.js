import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class BlockPrefab {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.physics = this.experience.physics

        this.group = new THREE.Group()

        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true

        this.group.add(mesh)

        this.instances = [] // Guardamos las instancias para actualizar sus físicas
    }

    getInstance(position = { x: 0, y: 0, z: 0 }, log = false) {
        const clone = this.group.clone(true)
        clone.position.set(position.x, position.y, position.z)
        this.scene.add(clone)

        // Crear cuerpo físico
        const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
        const body = new CANNON.Body({
            mass: 0.2,
            shape: shape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.9
        })
        this.physics.world.addBody(body)

        // Guardar la relación para sincronizar
        this.instances.push({ mesh: clone, body: body })
        if (log) {
            console.log(`📦 Bloque creado manualmente en: x=${position.x}, y=${position.y}, z=${position.z}`)
        }


        return clone
    }

    update() {
        // Sincronizar posición física y visual
        this.instances.forEach(({ mesh, body }) => {
            mesh.position.copy(body.position)
            mesh.quaternion.copy(body.quaternion)
        })
    }
}
