// Experience/Utils/Physics.js
import * as CANNON from 'cannon-es'

export default class Physics {
    constructor() {
        // Crear el mundo físico
        this.world = new CANNON.World()
        this.world.gravity.set(0, -9.82, 0)

        // Broadphase eficiente
        this.world.broadphase = new CANNON.SAPBroadphase(this.world)
        this.world.allowSleep = true

        // ✅ Material por defecto
        this.defaultMaterial = new CANNON.Material('default')

        const defaultContact = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.4,
                restitution: 0.0
            }
        )
        this.world.defaultContactMaterial = defaultContact
        this.world.addContactMaterial(defaultContact)

        // ✅ Materiales personalizados
        this.robotMaterial = new CANNON.Material('robot')
        this.obstacleMaterial = new CANNON.Material('obstacle')
        this.wallMaterial = new CANNON.Material('wall') // ⬅️ Nuevo material para muros

        // Contacto: robot vs obstáculos
        const robotObstacleContact = new CANNON.ContactMaterial(
            this.robotMaterial,
            this.obstacleMaterial,
            {
                friction: 0.6,
                restitution: 0.0, // ⬅️ elimina rebote
                contactEquationStiffness: 1e9,
                contactEquationRelaxation: 3,
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 3
            }
        )

        this.world.addContactMaterial(robotObstacleContact)


        // Contacto: robot vs muros (más firme aún)
        const robotWallContact = new CANNON.ContactMaterial(
            this.robotMaterial,
            this.wallMaterial,
            {
                friction: 0.6,
                restitution: 0.0,
                contactEquationStiffness: 1e9,        // ⬅️ más rígido
                contactEquationRelaxation: 2,         // ⬅️ menos elástico
                frictionEquationStiffness: 1e7,
                frictionEquationRelaxation: 2
            }
        )

        this.world.addContactMaterial(robotWallContact)

        //console.log('📋 ContactMaterials registrados:', this.world.contactmaterials)
    }

    update(delta) {
        this.world.step(1 / 60, delta, 3)
    }
}
