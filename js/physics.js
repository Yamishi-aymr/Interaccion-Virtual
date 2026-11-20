
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: PHYSICS.JS

   Motor físico mediante Cannon-es.

   Correcciones:
   - Normales exteriores de pirámides.
   - Normales exteriores de octaedros.
   - Colisiones convexas corregidas.
   - Límites completos de recipientes.
   - Gravedad y estabilidad.
===================================================== */

import * as CANNON from 'cannon-es';


// =============================================
// CONFIGURACIÓN
// =============================================

const PHYSICS_CONFIG = {

    gravity: -9.82,

    fixedTimeStep: 1 / 60,

    maxSubSteps: 5,

    maxDeltaTime: 0.05,

    solverIterations: 20,

    defaultFriction: 0.5,

    defaultRestitution: 0.08

};


// =============================================
// CONVERSIÓN DE VECTORES
// =============================================

function toCannonVector(vector) {

    return new CANNON.Vec3(
        vector.x,
        vector.y,
        vector.z
    );

}


// =============================================
// CORREGIR ORIENTACIÓN DE CARAS
// =============================================

/*
   Cannon-es necesita que las caras de un
   ConvexPolyhedron tengan normales exteriores.

   Invertimos el orden de los vértices de cada
   cara para orientar correctamente las normales.
*/

function reverseFaces(faces) {

    return faces.map(face => {

        return [...face].reverse();

    });

}


// =============================================
// CREAR PIRÁMIDE
// =============================================

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

        faces: reverseFaces(faces)

    });

}


// =============================================
// CREAR OCTAEDRO
// =============================================

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

        faces: reverseFaces(faces)

    });

}


// =============================================
// CREAR FORMAS FÍSICAS
// =============================================

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
// CREAR MUNDO FÍSICO
// =============================================

export function createPhysicsWorld() {

    console.log('[PHYSICS] Inicializando motor físico...');


    const world = new CANNON.World();


    // Gravedad.
    world.gravity.set(

        0,

        PHYSICS_CONFIG.gravity,

        0

    );


    world.allowSleep = true;


    // Solucionador.
    world.solver.iterations =

        PHYSICS_CONFIG.solverIterations;

    world.solver.tolerance = 0.001;


    // Detección de colisiones.
    world.broadphase = new CANNON.SAPBroadphase(world);


    // =================================
    // MATERIALES
    // =================================

    const defaultMaterial = new CANNON.Material('default');

    const objectMaterial = new CANNON.Material('objects');

    const surfaceMaterial = new CANNON.Material('surfaces');


    const objectContact = new CANNON.ContactMaterial(

        objectMaterial,

        objectMaterial,

        {

            friction: 0.45,

            restitution: 0.08

        }

    );


    const surfaceContact = new CANNON.ContactMaterial(

        objectMaterial,

        surfaceMaterial,

        {

            friction: 0.65,

            restitution: 0.05

        }

    );


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
    // CUERPOS ESTÁTICOS
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
    // CUERPOS DINÁMICOS
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
    // CREAR RECIPIENTE
    // =================================

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

            top: position.y + height,

            bottom: position.y,

            bounds: {

                minX: position.x - width / 2,

                maxX: position.x + width / 2,

                minZ: position.z - depth / 2,

                maxZ: position.z + depth / 2,

                minY: position.y,

                maxY: position.y + height

            }

        };

    }


    // =============================================
    // CUERPOS CINEMÁTICOS
    // =============================================

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

        body.aabbNeedsUpdate = true;

    }


    // =============================================
    // RESTAURAR CUERPO DINÁMICO
    // =============================================

    function setDynamic(body, mass = 1) {

        if (!body) {

            return;

        }


        body.type = CANNON.Body.DYNAMIC;

        body.mass = mass;


        body.updateMassProperties();


        body.velocity.set(0, 0, 0);

        body.angularVelocity.set(0, 0, 0);


        body.aabbNeedsUpdate = true;

        body.wakeUp();

    }


    // =============================================
    // MOVER CUERPO CINEMÁTICO
    // =============================================

    function moveKinematicBody(

        body,

        position,

        deltaTime = 1 / 60

    ) {

        if (!body) {

            return;

        }


        const safeDelta = Math.max(

            deltaTime,

            1 / 120

        );


        const nextPosition = toCannonVector(position);


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


    // =============================================
    // SINCRONIZAR MALLA Y CUERPO
    // =============================================

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


    // =============================================
    // SINCRONIZAR TODOS LOS OBJETOS
    // =============================================

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


    // =============================================
    // ELIMINAR CUERPO
    // =============================================

    function removeBody(body) {

        if (!body) {

            return;

        }


        world.removeBody(body);

    }


    // =============================================
    // ESTADÍSTICAS
    // =============================================

    function getStats() {

        return {

            bodies: world.bodies.length,

            gravity: PHYSICS_CONFIG.gravity,

            fixedTimeStep: PHYSICS_CONFIG.fixedTimeStep,

            solverIterations: PHYSICS_CONFIG.solverIterations

        };

    }


    // =============================================
    // LIBERAR RECURSOS
    // =============================================

    function dispose() {

        const bodies = [...world.bodies];


        bodies.forEach(body => {

            world.removeBody(body);

        });


        console.log('[PHYSICS] Mundo físico liberado.');

    }


    // =============================================
    // API PÚBLICA
    // =============================================

    console.log('[PHYSICS] Motor físico preparado.');


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
