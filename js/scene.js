
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: SCENE.JS

   Escenario 3D:
   - 4 mesas de trabajo
   - 32 objetos geométricos
   - 4 recipientes
   - Suelo y paredes
   - Iluminación ambiental

   Three.js + Cannon-es
===================================================== */

import * as THREE from 'three';

import {
    randomRange,
    shuffleArray,
    generateId,
    CATEGORIES,
    TABLE_POSITIONS,
    CONTAINER_POSITIONS
} from './utils.js';


// =============================================
// CONFIGURACIÓN DEL LABORATORIO
// =============================================

const SCENE_CONFIG = {

    floorSize: 16,

    wallHeight: 3.5,

    wallThickness: 0.3,

    tableWidth: 3.4,

    tableDepth: 2.4,

    tableHeight: 0.82,

    tableThickness: 0.16,

    tableLegHeight: 0.76,

    objectsPerTable: 8,

    totalObjects: 32,

    containerWidth: 1.4,

    containerDepth: 1.4,

    containerHeight: 0.8,

    containerWallThickness: 0.08

};


// =============================================
// MATERIALES VISUALES
// =============================================


const COLORS = {

    // Ambiente pastel
    floor: 0xD9E2ED,
    floorGrid: 0xB5B6D4,

    // Mobiliario
    table: 0xC4C5DD,
    tableEdge: 0xA6DDE8,

    // Figuras
    sphere: 0x69BFE6,
    cube: 0xE99AAE,
    pyramid: 0xEBC77D,
    octahedron: 0xB49BD9,

    // Recipientes
    containerBase: 0xD5D0E5,

    // Paredes
    walls: 0xD9D0E8

};

// =============================================
// CREAR MATERIALES
// =============================================

function createMaterials() {

    return {

        floor: new THREE.MeshStandardMaterial({

            color: COLORS.floor,

            roughness: 0.85,

            metalness: 0.2

        }),


        table: new THREE.MeshStandardMaterial({

            color: COLORS.table,

            roughness: 0.55,

            metalness: 0.55

        }),


        tableEdge: new THREE.MeshStandardMaterial({

            color: COLORS.tableEdge,

            emissive: COLORS.tableEdge,

            emissiveIntensity: 0.35,

            metalness: 0.65,

            roughness: 0.3

        }),


        containerBase: new THREE.MeshStandardMaterial({

            color: COLORS.containerBase,

            metalness: 0.65,

            roughness: 0.35

        }),



        wall: new THREE.MeshStandardMaterial({

            color: COLORS.walls,

            roughness: 0.9,

            metalness: 0.05,

            transparent: true,

            opacity: 0.88,

            side: THREE.DoubleSide,

            depthWrite: true

        })


    };

}


// =============================================
// MATERIALES DE CATEGORÍAS
// =============================================

function createCategoryMaterials() {

    return {

        sphere: new THREE.MeshStandardMaterial({

            color: COLORS.sphere,

            roughness: 0.24,

            metalness: 0.25,

            emissive: COLORS.sphere,

            emissiveIntensity: 0.08

        }),


        cube: new THREE.MeshStandardMaterial({

            color: COLORS.cube,

            roughness: 0.3,

            metalness: 0.2,

            emissive: COLORS.cube,

            emissiveIntensity: 0.06

        }),


        pyramid: new THREE.MeshStandardMaterial({

            color: COLORS.pyramid,

            roughness: 0.3,

            metalness: 0.25,

            emissive: COLORS.pyramid,

            emissiveIntensity: 0.08

        }),


        octahedron: new THREE.MeshStandardMaterial({

            color: COLORS.octahedron,

            roughness: 0.25,

            metalness: 0.3,

            emissive: COLORS.octahedron,

            emissiveIntensity: 0.08

        })

    };

}


// =============================================
// ILUMINACIÓN
// =============================================


function createLighting(scene) {

    // Luz ambiental azul y violeta.
    const ambient = new THREE.HemisphereLight(
        0xFFFFFF,
        0xD8CFE8,
        2.2
    );

    scene.add(ambient);


    // Iluminación principal blanca.
    const mainLight = new THREE.DirectionalLight(
        0xFFF8F5,
        2.5
    );

    mainLight.position.set(4, 9, 5);

    scene.add(mainLight);


    // Luz rosa pastel.
    const purpleLight = new THREE.PointLight(
        0xD8B9F0,
        18,
        18
    );

    purpleLight.position.set(-4, 3, -3);

    scene.add(purpleLight);


    // Luz azul cielo.
    const cyanLight = new THREE.PointLight(
        0xA8E4F0,
        20,
        18
    );

    cyanLight.position.set(4, 3, 3);

    scene.add(cyanLight);


    // Luz central blanca.
    const centerLight = new THREE.PointLight(
        0xFFF4EC,
        18,
        16
    );

    centerLight.position.set(0, 5, 0);

    scene.add(centerLight);


    return {
        ambient,
        mainLight,
        purpleLight,
        cyanLight,
        centerLight
    };

}


// =============================================
// CREAR SUELO
// =============================================

function createFloor(scene, physics, materials) {

    const size = SCENE_CONFIG.floorSize;


    // Suelo visual.
    const geometry = new THREE.PlaneGeometry(

        size,

        size

    );


    const floor = new THREE.Mesh(

        geometry,

        materials.floor

    );


    floor.rotation.x = -Math.PI / 2;

    floor.position.y = 0;

    floor.receiveShadow = true;

    floor.name = 'Laboratory-Floor';

    scene.add(floor);


    // Suelo físico.
    physics.createStaticBox({

        position: {

            x: 0,

            y: -0.1,

            z: 0

        },

        halfExtents: {

            x: size / 2,

            y: 0.1,

            z: size / 2

        },

        name: 'Laboratory-Floor-Physics'

    });


    // Cuadrícula decorativa.
    const grid = new THREE.GridHelper(
    size,
    32,
    0xB8A8D9,
    0xC5D7E6
);
    grid.position.y = 0.008;

    scene.add(grid);


    return {

        floor,

        grid

    };

}


// =============================================
// CREAR PAREDES DEL LABORATORIO
// =============================================

function createWalls(scene, physics, materials) {

    const size = SCENE_CONFIG.floorSize;

    const half = size / 2;

    const height = SCENE_CONFIG.wallHeight;

    const thickness = SCENE_CONFIG.wallThickness;


    const walls = [];


    const definitions = [

        {

            name: 'Wall-Back',

            position: {

                x: 0,

                y: height / 2,

                z: -half

            },

            dimensions: {

                x: half,

                y: height / 2,

                z: thickness / 2

            },

            visual: {

                x: size,

                y: height,

                z: thickness

            }

        },


        {

            name: 'Wall-Front',

            position: {

                x: 0,

                y: height / 2,

                z: half

            },

            dimensions: {

                x: half,

                y: height / 2,

                z: thickness / 2

            },

            visual: {

                x: size,

                y: height,

                z: thickness

            }

        },


        {

            name: 'Wall-Left',

            position: {

                x: -half,

                y: height / 2,

                z: 0

            },

            dimensions: {

                x: thickness / 2,

                y: height / 2,

                z: half

            },

            visual: {

                x: thickness,

                y: height,

                z: size

            }

        },


        {

            name: 'Wall-Right',

            position: {

                x: half,

                y: height / 2,

                z: 0

            },

            dimensions: {

                x: thickness / 2,

                y: height / 2,

                z: half

            },

            visual: {

                x: thickness,

                y: height,

                z: size

            }

        }

    ];


    definitions.forEach(definition => {

        // Visual.
        const mesh = new THREE.Mesh(

            new THREE.BoxGeometry(

                definition.visual.x,

                definition.visual.y,

                definition.visual.z

            ),

            materials.wall

        );


        mesh.position.set(

            definition.position.x,

            definition.position.y,

            definition.position.z

        );


        mesh.name = definition.name;

        scene.add(mesh);


        // Física.
        physics.createStaticBox({

            position: definition.position,

            halfExtents: definition.dimensions,

            name: `${definition.name}-Physics`

        });


        walls.push(mesh);

    });


    return walls;

}


// =============================================
// CREAR MESA DE TRABAJO
// =============================================

function createTable(scene, physics, position, index, materials) {

    const group = new THREE.Group();

    group.name = `Work-Table-${index + 1}`;


    const width = SCENE_CONFIG.tableWidth;

    const depth = SCENE_CONFIG.tableDepth;

    const tableHeight = SCENE_CONFIG.tableHeight;

    const thickness = SCENE_CONFIG.tableThickness;

    const legHeight = SCENE_CONFIG.tableLegHeight;


    // =================================
    // SUPERFICIE PRINCIPAL
    // =================================

    const top = new THREE.Mesh(

        new THREE.BoxGeometry(

            width,

            thickness,

            depth

        ),

        materials.table

    );


    top.position.y = tableHeight;

    top.name = `Table-${index + 1}-Surface`;

    group.add(top);


    // Borde luminoso.
    const edge = new THREE.Mesh(

        new THREE.BoxGeometry(

            width + 0.04,

            0.035,

            depth + 0.04

        ),

        materials.tableEdge

    );


    edge.position.y = tableHeight - thickness / 2;

    group.add(edge);


    // =================================
    // PATAS
    // =================================

    const legGeometry = new THREE.BoxGeometry(

        0.13,

        legHeight,

        0.13

    );


    const legPositions = [

        [-width / 2 + 0.15, -depth / 2 + 0.15],

        [width / 2 - 0.15, -depth / 2 + 0.15],

        [-width / 2 + 0.15, depth / 2 - 0.15],

        [width / 2 - 0.15, depth / 2 - 0.15]

    ];


    legPositions.forEach((offset, legIndex) => {

        const leg = new THREE.Mesh(

            legGeometry,

            materials.table

        );


        leg.position.set(

            offset[0],

            legHeight / 2,

            offset[1]

        );


        leg.name = `Table-${index + 1}-Leg-${legIndex + 1}`;

        group.add(leg);


        // Colisión física de cada pata.
        physics.createStaticBox({

            position: {

                x: position.x + offset[0],

                y: legHeight / 2,

                z: position.z + offset[1]

            },

            halfExtents: {

                x: 0.065,

                y: legHeight / 2,

                z: 0.065

            },

            name: `Table-${index + 1}-Leg-Physics`

        });

    });


    group.position.set(

        position.x,

        0,

        position.z

    );


    scene.add(group);


    // Colisión física de la superficie.
    physics.createStaticBox({

        position: {

            x: position.x,

            y: tableHeight,

            z: position.z

        },

        halfExtents: {

            x: width / 2,

            y: thickness / 2,

            z: depth / 2

        },

        name: `Table-${index + 1}-Top-Physics`

    });


    return {

        id: index + 1,

        mesh: group,

        position: group.position.clone(),

        width,

        depth,

        height: tableHeight

    };

}


// =============================================
// CREAR ETIQUETA 3D
// =============================================

function createLabel(scene, text, color, position) {

    const canvas = document.createElement('canvas');

    canvas.width = 512;

    canvas.height = 128;


    const context = canvas.getContext('2d');


    // Fondo.
    context.fillStyle = 'rgba(248, 245, 252, 0.95)';

    context.fillRect(

        0,

        0,

        canvas.width,

        canvas.height

    );


    // Borde.
    context.strokeStyle = color;

    context.lineWidth = 6;

    context.strokeRect(

        4,

        4,

        canvas.width - 8,

        canvas.height - 8

    );


    // Texto.
    context.font = 'bold 42px Arial';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillStyle = '#526078';

    context.fillText(

        text.toUpperCase(),

        canvas.width / 2,

        canvas.height / 2

    );


    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;


    const material = new THREE.SpriteMaterial({

        map: texture,

        transparent: true,

        depthWrite: false

    });


    const sprite = new THREE.Sprite(material);


    sprite.scale.set(

        1.65,

        0.42,

        1

    );


    sprite.position.copy(position);

    sprite.name = `Label-${text}`;


    scene.add(sprite);


    return sprite;

}


// =============================================
// CREAR RECIPIENTE VISUAL
// =============================================

function createContainerVisual(

    scene,

    physics,

    position,

    category,

    index,

    materials

) {

    const width = SCENE_CONFIG.containerWidth;

    const depth = SCENE_CONFIG.containerDepth;

    const height = SCENE_CONFIG.containerHeight;

    const thickness = SCENE_CONFIG.containerWallThickness;


    const categoryData = CATEGORIES[category.toUpperCase()];


    if (!categoryData) {

        throw new Error(

            `Categoría de recipiente inválida: ${category}`

        );

    }


    const color = categoryData.color;


    const accentMaterial = new THREE.MeshStandardMaterial({

        color,

        emissive: color,

        emissiveIntensity: 0.35,

        metalness: 0.55,

        roughness: 0.3

    });


    const wallMaterial = new THREE.MeshStandardMaterial({

        color,

        emissive: color,

        emissiveIntensity: 0.12,

        transparent: true,

        opacity: 0.48,

        metalness: 0.4,

        roughness: 0.3,

        side: THREE.DoubleSide,

        depthWrite: false

    });


    const group = new THREE.Group();

    group.name = `Container-${category}`;


    // =================================
    // FONDO DEL RECIPIENTE
    // =================================

    const bottom = new THREE.Mesh(

        new THREE.BoxGeometry(

            width + thickness * 2,

            thickness,

            depth + thickness * 2

        ),

        materials.containerBase

    );


    bottom.position.y = position.y - thickness / 2;

    group.add(bottom);


    // Borde luminoso del fondo.
    const baseBorder = new THREE.Mesh(

        new THREE.BoxGeometry(

            width + thickness * 2 + 0.04,

            0.025,

            depth + thickness * 2 + 0.04

        ),

        accentMaterial

    );


    baseBorder.position.y = position.y - thickness / 2;

    group.add(baseBorder);


    // =================================
    // PAREDES DEL RECIPIENTE
    // =================================

    const wallDefinitions = [

        {

            name: 'Left',

            position: {

                x: -width / 2 - thickness / 2,

                y: height / 2,

                z: 0

            },

            dimensions: [

                thickness,

                height,

                depth

            ]

        },


        {

            name: 'Right',

            position: {

                x: width / 2 + thickness / 2,

                y: height / 2,

                z: 0

            },

            dimensions: [

                thickness,

                height,

                depth

            ]

        },


        {

            name: 'Front',

            position: {

                x: 0,

                y: height / 2,

                z: depth / 2 + thickness / 2

            },

            dimensions: [

                width,

                height,

                thickness

            ]

        },


        {

            name: 'Back',

            position: {

                x: 0,

                y: height / 2,

                z: -depth / 2 - thickness / 2

            },

            dimensions: [

                width,

                height,

                thickness

            ]

        }

    ];


    wallDefinitions.forEach(definition => {

        const wall = new THREE.Mesh(

            new THREE.BoxGeometry(

                ...definition.dimensions

            ),

            wallMaterial

        );


        wall.position.set(

            position.x + definition.position.x,

            position.y + definition.position.y,

            position.z + definition.position.z

        );


        wall.name = `Container-${category}-${definition.name}`;

        group.add(wall);

    });


    group.position.set(

        position.x,

        0,

        position.z

    );


    scene.add(group);


    // =================================
    // CUERPOS FÍSICOS
    // =================================

    const physicalContainer = physics.createContainer({

        position,

        width,

        depth,

        height,

        wallThickness: thickness,

        name: `Container-${category}`

    });


    // =================================
    // ETIQUETA
    // =================================

    const label = createLabel(

        scene,

        categoryData.name,

        categoryData.hexColor,

        new THREE.Vector3(

            position.x,

            position.y + height + 0.45,

            position.z

        )

    );


    return {

        id: index + 1,

        category: category.toLowerCase(),

        categoryName: categoryData.name,

        color,

        mesh: group,

        label,

        physics: physicalContainer,

        position: new THREE.Vector3(

            position.x,

            position.y,

            position.z

        ),

        width,

        depth,

        height,

        objectsInside: []

    };

}


// =============================================
// CREAR GEOMETRÍA DE OBJETOS
// =============================================

function createObjectGeometry(category) {

    switch (category) {

        case 'sphere':

            return new THREE.SphereGeometry(

                0.28,

                24,

                18

            );


        case 'cube':

            return new THREE.BoxGeometry(

                0.55,

                0.55,

                0.55

            );


        case 'pyramid':

            return new THREE.ConeGeometry(

                0.38,

                0.68,

                4

            );


        case 'octahedron':

            return new THREE.OctahedronGeometry(

                0.38,

                0

            );


        default:

            throw new Error(

                `Geometría desconocida: ${category}`

            );

    }

}


// =============================================
// CONFIGURACIÓN FÍSICA DE OBJETOS
// =============================================

function getObjectPhysicsOptions(category) {

    switch (category) {

        case 'sphere':

            return {

                mass: 0.75,

                shapeOptions: {

                    radius: 0.28

                }

            };


        case 'cube':

            return {

                mass: 0.95,

                shapeOptions: {

                    width: 0.55,

                    height: 0.55,

                    depth: 0.55

                }

            };


        case 'pyramid':

            return {

                mass: 0.85,

                shapeOptions: {

                    width: 0.76,

                    height: 0.68,

                    depth: 0.76

                }

            };


        case 'octahedron':

            return {

                mass: 0.85,

                shapeOptions: {

                    radius: 0.38

                }

            };


        default:

            throw new Error(

                `Física desconocida: ${category}`

            );

    }

}


// =============================================
// POSICIONES DE LOS OBJETOS EN LAS MESAS
// =============================================

function getTableObjectPositions(table, count) {

    // Ocho posiciones distribuidas en dos filas.
    const offsets = [

        [-1.20, -0.55],
        [-0.40, -0.55],
        [0.40, -0.55],
        [1.20, -0.55],

        [-1.20, 0.55],
        [-0.40, 0.55],
        [0.40, 0.55],
        [1.20, 0.55]

    ];


    const positions = [];


    for (let i = 0; i < count; i++) {

        const offset = offsets[i];


        positions.push({

            x: table.x + offset[0] + randomRange(-0.025, 0.025),

            y: SCENE_CONFIG.tableHeight + 0.55,

            z: table.z + offset[1] + randomRange(-0.025, 0.025)

        });

    }


    return positions;

}


// =============================================
// CREAR OBJETO GEOMÉTRICO
// =============================================

function createGeometricObject(

    scene,

    physics,

    category,

    position,

    categoryMaterials,

    index,

    tableIndex

) {

    const geometry = createObjectGeometry(category);

    const material = categoryMaterials[category];


    const mesh = new THREE.Mesh(

        geometry,

        material

    );


    mesh.position.set(

        position.x,

        position.y,

        position.z

    );


    mesh.rotation.set(

        randomRange(-0.2, 0.2),

        randomRange(0, Math.PI * 2),

        randomRange(-0.2, 0.2)

    );


    mesh.castShadow = true;

    mesh.receiveShadow = true;

    mesh.name = `Object-${category}-${index}`;


    // =================================
    // DATOS FÍSICOS
    // =================================

    const physicsOptions = getObjectPhysicsOptions(category);


    const body = physics.createDynamicBody({

        category,

        position,

        mass: physicsOptions.mass,

        shapeOptions: physicsOptions.shapeOptions,

        friction: 0.5,

        restitution: 0.12,

        name: mesh.name

    });


    // Sincronizar rotación inicial.
    body.quaternion.setFromEuler(

        mesh.rotation.x,

        mesh.rotation.y,

        mesh.rotation.z

    );


    // =================================
    // DATOS DEL OBJETO
    // =================================

    const objectData = {

        id: generateId(category),

        category,

        categoryName: CATEGORIES[category.toUpperCase()].name,

        mesh,

        body,

        tableIndex,

        initialPosition: new THREE.Vector3(

            position.x,

            position.y,

            position.z

        ),

        isGrabbed: false,

        isClassified: false,

        isCorrect: false,

        isBeingProcessed: false

    };


    // Datos para interacción.
    mesh.userData.objectData = objectData;

    mesh.userData.objectId = objectData.id;

    mesh.userData.category = category;

    mesh.userData.isGrabbable = true;


    body.userData.objectData = objectData;


    scene.add(mesh);


    return objectData;

}


// =============================================
// GENERAR LOS 32 OBJETOS
// =============================================

function createAllObjects(

    scene,

    physics,

    tables,

    categoryMaterials

) {

    const categories = [];


    // Crear ocho objetos por categoría.
    Object.keys(CATEGORIES).forEach(categoryKey => {

        const category = CATEGORIES[categoryKey];


        for (let i = 0; i < category.count; i++) {

            categories.push(category.id);

        }

    });


    // Mezclar las treinta y dos figuras.
    const shuffledCategories = shuffleArray(categories);


    const objects = [];

    let objectIndex = 0;


    // Repartir ocho objetos por mesa.
    tables.forEach((table, tableIndex) => {

        const positions = getTableObjectPositions(

            table.position,

            SCENE_CONFIG.objectsPerTable

        );


        for (let i = 0; i < SCENE_CONFIG.objectsPerTable; i++) {

            const category = shuffledCategories[objectIndex];

            const position = positions[i];


            const object = createGeometricObject(

                scene,

                physics,

                category,

                position,

                categoryMaterials,

                objectIndex + 1,

                tableIndex

            );


            objects.push(object);

            objectIndex++;

        }

    });


    console.log(

        `[SCENE] ${objects.length} objetos generados.`

    );


    return objects;

}


// =============================================
// CREAR ELEMENTOS DECORATIVOS
// =============================================

function createDecorations(scene) {

    const decorations = [];


    // Anillo central decorativo.
    const ringGeometry = new THREE.TorusGeometry(

        0.8,

        0.015,

        8,

        80

    );


    const ringMaterial = new THREE.MeshBasicMaterial({

        color: 0x7865FF,

        transparent: true,

        opacity: 0.5

    });


    const ring = new THREE.Mesh(

        ringGeometry,

        ringMaterial

    );


    ring.rotation.x = Math.PI / 2;

    ring.position.set(

        0,

        0.025,

        0

    );


    scene.add(ring);

    decorations.push(ring);


    // Marcadores luminosos en el suelo.
    const markerMaterial = new THREE.MeshBasicMaterial({

        color: 0x28D9FF,

        transparent: true,

        opacity: 0.5

    });


    const markerGeometry = new THREE.TorusGeometry(

        0.12,

        0.012,

        6,

        24

    );


    const markerPositions = [

        [-5.5, -5.5],

        [5.5, -5.5],

        [-5.5, 5.5],

        [5.5, 5.5]

    ];


    markerPositions.forEach((position, index) => {

        const marker = new THREE.Mesh(

            markerGeometry,

            markerMaterial

        );


        marker.rotation.x = Math.PI / 2;

        marker.position.set(

            position[0],

            0.025,

            position[1]

        );


        marker.name = `Floor-Marker-${index + 1}`;

        scene.add(marker);

        decorations.push(marker);

    });


    return decorations;

}


// =============================================
// CREAR ESCENA COMPLETA
// =============================================

export function createLaboratoryScene(scene, physics) {

    console.log(

        '[SCENE] Construyendo laboratorio 3D...'

    );


    // =================================
    // CONFIGURAR ESCENA
    // =================================

    scene.background = new THREE.Color(0xE9E2EF);

    scene.fog = new THREE.Fog(
        0xE9E2EF,
        22,
        38
    );


    const materials = createMaterials();

    const categoryMaterials = createCategoryMaterials();


    // =================================
    // ILUMINACIÓN
    // =================================

    const lights = createLighting(scene);


    // =================================
    // SUELO
    // =================================

    const floor = createFloor(

        scene,

        physics,

        materials

    );


    // =================================
    // PAREDES
    // =================================

    const walls = createWalls(

        scene,

        physics,

        materials

    );


    // =================================
    // MESAS
    // =================================

    const tables = [];


    TABLE_POSITIONS.forEach((position, index) => {

        const table = createTable(

            scene,

            physics,

            position,

            index,

            materials

        );


        tables.push(table);

    });


    // =================================
    // RECIPIENTES
    // =================================

    const categoryKeys = [

        'sphere',

        'cube',

        'pyramid',

        'octahedron'

    ];


    const containers = [];


    categoryKeys.forEach((category, index) => {

        const container = createContainerVisual(

            scene,

            physics,

            CONTAINER_POSITIONS[index],

            category,

            index,

            materials

        );


        containers.push(container);

    });


    // =================================
    // OBJETOS
    // =================================

    const objects = createAllObjects(

        scene,

        physics,

        tables,

        categoryMaterials

    );


    // =================================
    // DECORACIONES
    // =================================

    const decorations = createDecorations(scene);


    // =================================
    // RESULTADO
    // =================================

    console.log(

        '[SCENE] Laboratorio creado correctamente.'

    );


    console.log({

        mesas: tables.length,

        recipientes: containers.length,

        objetos: objects.length,

        categorias: categoryKeys.length,

        cuerposFisicos: physics.getStats().bodies

    });


    return {

        scene,

        floor,

        walls,

        tables,

        containers,

        objects,

        decorations,

        lights,

        materials,

        categoryMaterials,

        config: SCENE_CONFIG

    };

}


// =============================================
// LIBERAR RECURSOS VISUALES
// =============================================

export function disposeLaboratoryScene(laboratory) {

    if (!laboratory) {
        return;
    }


    const resources = new Set();


    laboratory.scene.traverse(object => {

        if (object.geometry) {

            resources.add(object.geometry);

        }


        if (object.material) {

            const materials = Array.isArray(object.material)

                ? object.material

                : [object.material];


            materials.forEach(material => {

                if (!material) {
                    return;
                }


                resources.add(material);


                Object.values(material).forEach(value => {

                    if (value && value.isTexture) {

                        resources.add(value);

                    }

                });

            });

        }

    });


    resources.forEach(resource => {

        if (resource.dispose) {

            resource.dispose();

        }

    });


    console.log(

        '[SCENE] Recursos visuales liberados.'

    );

}
