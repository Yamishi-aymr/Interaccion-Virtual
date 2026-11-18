
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: PHYSICS.JS
   Motor físico mediante Cannon-es
===================================================== */

import * as CANNON from 'cannon-es';


// =============================================
// CONFIGURACIÓN GENERAL
// =============================================

const PHYSICS_CONFIG = {

    gravity: -9.82,

    fixedTimeStep: 1 / 60,

    maxSubSteps: 5,

    maxDeltaTime: 0.05,

    solverIterations: 12,

    defaultFriction: 0.5,

    defaultRestitution: 0.15

};


// =============================================
// CONVERSIÓN DE VECTORES
// =============================================

/**
 * Convierte un vector de Three.js o un objeto
 * {x, y, z} a un vector de Cannon-es.
 */
function toCannonVector(vector) {

    return new CANNON.Vec3(
        vector.x,
        vector.y,
        vector.z
    );

}


// =============================================
// CREAR FORMAS CONVEXAS
// =============================================

/**
 * Crea la geometría física de una pirámide cuadrangular.
 *
 * El origen está en el centro de la figura.
 */
function createPyramidShape(width, height, depth) {

    const x = width / 2;

    const y = height / 2;

    const z = depth / 2;


    const vertices = [

        new CANNON.Vec3(-x, -y, -z),

        new CANNON.Vec3(x, -y, -z),

        new CANNON.Vec3(x, -y, z),

        new CANNON.Vec3(-x, -y, z),

        new CANNON.Vec3(0, y, 0)

    ];


    const faces = [

        [0, 3, 2, 1],

        [0, 1, 4],

        [1, 2, 4],

        [2, 3, 4],

        [3, 0, 4]

    ];


    return new CANNON.ConvexPolyhedron({

        vertices,

        faces

    });

}


/**
 * Crea la geometría física de un octaedro.
 */
function createOctahedronShape(radius) {

    const vertices = [

        new CANNON.Vec3(0, radius, 0),

        new CANNON.Vec3(0, -radius, 0),

        new CANNON.Vec3(radius, 0, 0),

        new CANNON.Vec3(-radius, 0, 0),

        new CANNON.Vec3(0, 0, radius),

        new CANNON.Vec3(0, 0, -radius)

    ];


    const faces = [

        [0, 2, 4],

        [0, 4, 3],

        [0, 3, 5],

        [0, 5, 2],

        [1, 4, 2],

        [1, 3, 4],

        [1, 5, 3],

        [1, 2, 5]

    ];


    return new CANNON.ConvexPolyhedron({

        vertices,

        faces

    });

}


// =============================================
// CREAR FORMAS FÍSICAS
// =============================================

/**
 * Crea una forma física según la categoría.
 *
 * Categorías:
 * sphere
 * cube
 * pyramid
 * octahedron
 */
export function createPhysicsShape(category, options = {}) {

    const {

        radius = 0.3,

        width = 0.6,

        height = 0.6,

        depth = 0.6

    } = options;


    switch (category) {

        case 'sphere':

            return new CANNON.Sphere(radius);


        case 'cube':

            return new CANNON.Box(

                new CANNON.Vec3(

                    width / 2,

                    height / 2,

                    depth / 2

                )

            );


        case 'pyramid':

            return createPyramidShape(

                width,

                height,

                depth

            );


        case 'octahedron':

            return createOctahedronShape(radius);


        default:

            throw new Error(

                `Categoría física desconocida: ${category}`

            );

    }

}


// =============================================
// INICIALIZAR MOTOR FÍSICO
// =============================================

export function createPhysicsWorld() {

    console.log(
        '[PHYSICS] Inicializando motor físico...'
    );


    // =================================
    // CREAR MUNDO
    // =================================

    const world = new CANNON.World();


    // Gravedad.
    world.gravity.set(

        0,

        PHYSICS_CONFIG.gravity,

        0

    );


    // Permitir dormir cuerpos en reposo.
    world.allowSleep = true;


    // =================================
    // SOLUCIONADOR
    // =================================

    world.solver.iterations =
        PHYSICS_CONFIG.solverIterations;

    world.solver.tolerance = 0.001;


    // Broadphase para detección de colisiones.
    world.broadphase = new CANNON.SAPBroadphase(world);


    // =================================
    // MATERIALES FÍSICOS
    // =================================

    const defaultMaterial = new CANNON.Material(
        'default'
    );

    const objectMaterial = new CANNON.Material(
        'objects'
    );

    const surfaceMaterial = new CANNON.Material(
        'surfaces'
    );


    // Contacto entre objetos.
    const objectContact = new CANNON.ContactMaterial(

        objectMaterial,

        objectMaterial,

        {

            friction: 0.45,

            restitution: 0.15

        }

    );


    // Contacto entre objetos y superficies.
    const surfaceContact = new CANNON.ContactMaterial(

        objectMaterial,

        surfaceMaterial,

        {

            friction: 0.65,

            restitution: 0.08

        }

    );


    // Contacto predeterminado.
    world.defaultContactMaterial.friction =
        PHYSICS_CONFIG.defaultFriction;

    world.defaultContactMaterial.restitution =
        PHYSICS_CONFIG.defaultRestitution;


    world.addContactMaterial(objectContact);

    world.addContactMaterial(surfaceContact);


    // =================================
    // PASO DE SIMULACIÓN
    // =================================

    function step(deltaTime) {

        const safeDelta = Math.min(

            Math.max(deltaTime, 0),

            PHYSICS_CONFIG.maxDeltaTime

        );


        world.step(

            PHYSICS_CONFIG.fixedTimeStep,

            safeDelta,

            PHYSICS_CONFIG.maxSubSteps

        );

    }


    // =================================
    // CREAR CUERPO ESTÁTICO
    // =================================

    function createStaticBox({

        position,

        halfExtents,

        material = surfaceMaterial,

        quaternion = null,

        name = 'static-object'

    }) {

        const body = new CANNON.Body({

            mass: 0,

            material,

            type: CANNON.Body.STATIC

        });


        body.addShape(

            new CANNON.Box(

                toCannonVector(halfExtents)

            )

        );


        body.position.copy(

            toCannonVector(position)

        );


        if (quaternion) {

            body.quaternion.set(

                quaternion.x,

                quaternion.y,

                quaternion.z,

                quaternion.w

            );

        }


        body.userData = {

            name,

            type: 'static'

        };


        world.addBody(body);

        return body;

    }


    // =================================
    // CREAR CUERPO DINÁMICO
    // =================================

    function createDynamicBody({

        category,

        position,

        mass = 1,

        shapeOptions = {},

        friction = 0.5,

        restitution = 0.15,

        linearDamping = 0.08,

        angularDamping = 0.12,

        name = 'dynamic-object'

    }) {

        const shape = createPhysicsShape(

            category,

            shapeOptions

        );


        const body = new CANNON.Body({

            mass,

            material: objectMaterial,

            type: CANNON.Body.DYNAMIC,

            linearDamping,

            angularDamping,

            allowSleep: true,

            sleepSpeedLimit: 0.1,

            sleepTimeLimit: 0.5

        });


        body.addShape(shape);


        body.position.copy(

            toCannonVector(position)

        );


        body.material = objectMaterial;


        body.userData = {

            name,

            category,

            type: 'dynamic',

            friction,

            restitution

        };


        body.updateMassProperties();

        world.addBody(body);


        return body;

    }


    // =================================
    // CREAR RECIPIENTE ABIERTO
    // =================================

    /**
     * position representa el centro del fondo
     * del recipiente.
     *
     * El recipiente tiene:
     * - Un fondo.
     * - Una pared izquierda.
     * - Una pared derecha.
     * - Una pared frontal.
     * - Una pared trasera.
     */

    function createContainer({

        position,

        width = 1.4,

        depth = 1.4,

        height = 0.8,

        wallThickness = 0.08,

        material = surfaceMaterial,

        name = 'container'

    }) {

        const bodies = [];

        const halfWall = wallThickness / 2;


        // Fondo.
        const floor = createStaticBox({

            position: {

                x: position.x,

                y: position.y - halfWall,

                z: position.z

            },

            halfExtents: {

                x: width / 2 + wallThickness,

                y: halfWall,

                z: depth / 2 + wallThickness

            },

            material,

            name: `${name}-floor`

        });

        bodies.push(floor);


        // Pared izquierda.
        const leftWall = createStaticBox({

            position: {

                x: position.x - width / 2 - halfWall,

                y: position.y + height / 2,

                z: position.z

            },

            halfExtents: {

                x: halfWall,

                y: height / 2,

                z: depth / 2

            },

            material,

            name: `${name}-left-wall`

        });

        bodies.push(leftWall);


        // Pared derecha.
        const rightWall = createStaticBox({

            position: {

                x: position.x + width / 2 + halfWall,

                y: position.y + height / 2,

                z: position.z

            },

            halfExtents: {

                x: halfWall,

                y: height / 2,

                z: depth / 2

            },

            material,

            name: `${name}-right-wall`

        });

        bodies.push(rightWall);


        // Pared frontal.
        const frontWall = createStaticBox({

            position: {

                x: position.x,

                y: position.y + height / 2,

                z: position.z + depth / 2 + halfWall

            },

            halfExtents: {

                x: width / 2,

                y: height / 2,

                z: halfWall

            },

            material,

            name: `${name}-front-wall`

        });

        bodies.push(frontWall);


        // Pared trasera.
        const backWall = createStaticBox({

            position: {

                x: position.x,

                y: position.y + height / 2,

                z: position.z - depth / 2 - halfWall

            },

            halfExtents: {

                x: width / 2,

                y: height / 2,

                z: halfWall

            },

            material,

            name: `${name}-back-wall`

        });

        bodies.push(backWall);


        return {

            name,

            position: toCannonVector(position),

            width,

            depth,

            height,

            wallThickness,

            bodies,

            // Límite superior de las paredes.
            top: position.y + height,

            // Nivel del fondo interior.
            bottom: position.y,

            // Coordenadas interiores.
            bounds: {

                minX: position.x - width / 2,

                maxX: position.x + width / 2,

                minZ: position.z - depth / 2,

                maxZ: position.z + depth / 2,

                minY: position.y

            }

        };

    }


    // =================================
    // CUERPOS CINEMÁTICOS
    // =================================

    /**
     * Cambia un cuerpo dinámico a cinemático.
     * Se utilizará mientras el usuario sostiene
     * un objeto mediante el gesto de pinza.
     */
    function setKinematic(body) {

        if (!body) {
            return;
        }


        body.wakeUp();

        body.type = CANNON.Body.KINEMATIC;

        body.mass = 0;

        body.velocity.set(0, 0, 0);

        body.angularVelocity.set(0, 0, 0);

        body.updateMassProperties();

    }


    // =================================
    // RESTAURAR CUERPO DINÁMICO
    // =================================

    /**
     * Devuelve la física normal al objeto.
     */
    function setDynamic(body, mass = 1) {

        if (!body) {
            return;
        }


        body.type = CANNON.Body.DYNAMIC;

        body.mass = mass;

        body.updateMassProperties();

        body.velocity.set(0, 0, 0);

        body.angularVelocity.set(0, 0, 0);

        body.wakeUp();

    }


    // =================================
    // ACTUALIZAR POSICIÓN CINEMÁTICA
    // =================================

    function moveKinematicBody(body, position, deltaTime = 1 / 60) {

        if (!body) {
            return;
        }


        const safeDelta = Math.max(
            deltaTime,
            1 / 120
        );


        const nextPosition = toCannonVector(position);


        // Calcular velocidad para mantener una
        // respuesta física más estable.
        body.velocity.set(

            (nextPosition.x - body.position.x) / safeDelta,

            (nextPosition.y - body.position.y) / safeDelta,

            (nextPosition.z - body.position.z) / safeDelta

        );


        body.previousPosition.copy(body.position);

        body.position.copy(nextPosition);

        body.aabbNeedsUpdate = true;

        body.wakeUp();

    }


    // =================================
    // SINCRONIZAR MALLA Y CUERPO
    // =================================

    /**
     * Copia posición y rotación del cuerpo físico
     * al objeto visual de Three.js.
     */
    function syncMeshBody(mesh, body) {

        if (!mesh || !body) {
            return;
        }


        mesh.position.set(

            body.position.x,

            body.position.y,

            body.position.z

        );


        mesh.quaternion.set(

            body.quaternion.x,

            body.quaternion.y,

            body.quaternion.z,

            body.quaternion.w

        );

    }


    // =================================
    // SINCRONIZAR TODOS LOS OBJETOS
    // =================================

    function syncAll(objects) {

        objects.forEach(object => {

            if (!object.mesh || !object.body) {
                return;
            }

            syncMeshBody(

                object.mesh,

                object.body

            );

        });

    }


    // =================================
    // REMOVER CUERPOS
    // =================================

    function removeBody(body) {

        if (!body) {
            return;
        }

        world.removeBody(body);

    }


    // =================================
    // LIMPIAR MUNDO FÍSICO
    // =================================

    function dispose() {

        const bodies = [...world.bodies];

        bodies.forEach(body => {

            world.removeBody(body);

        });


        console.log(
            '[PHYSICS] Mundo físico liberado.'
        );

    }


    // =================================
    // INFORMACIÓN DEL MOTOR
    // =================================

    function getStats() {

        return {

            bodies: world.bodies.length,

            gravity: PHYSICS_CONFIG.gravity,

            fixedTimeStep: PHYSICS_CONFIG.fixedTimeStep,

            solverIterations:
                PHYSICS_CONFIG.solverIterations

        };

    }


    // =================================
    // API PÚBLICA
    // =================================

    console.log(
        '[PHYSICS] Motor físico preparado.'
    );


    return {

        world,

        materials: {

            defaultMaterial,

            objectMaterial,

            surfaceMaterial

        },

        step,

        createStaticBox,

        createDynamicBody,

        createContainer,

        createPhysicsShape,

        setKinematic,

        setDynamic,

        moveKinematicBody,

        syncMeshBody,

        syncAll,

        removeBody,

        getStats,

        dispose

    };

}
