/**
 * Created by mark on 9/17/16.
 */


document.addEventListener("DOMContentLoaded", onLoad);

var renderer, camera, scene, controls, container;

var plane = new THREE.Plane();
var box, box2;
var clickableObjects = [];
var collidableObjects = [];
var group = new THREE.Group();
var textMesh;
var texture;
var POSSIBLE_LETTERS = "ABCDEFGHIJKLMNOPRSTUVWXYZ";

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(),
    offset = new THREE.Vector3(),
    intersection = new THREE.Vector3(),
    INTERSECTED, SELECTED;

function onLoad() {
    container = document.createElement( 'div' );
//    document.body.appendChild( container );

    sceneSetup();
    addListeners();

    initialDraw();
    animate();
}

function addListeners() {
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
} // function addListeners()

function getCameraNormal() {
    var vector = new THREE.Vector3(0, 0, -1);
    vector.applyEuler(camera.rotation, camera.rotation.order);
    return vector;
} // function getCameraNormal()


function onDocumentMouseDown( event ) {
    var intersects;

    event.preventDefault();

    raycaster.setFromCamera( mouse, camera );

    if (group.children.length == 0)
    {
        intersects = raycaster.intersectObjects(clickableObjects);
        if (intersects.length > 0) {
            controls.enabled = false;

            group.add(intersects[0].object);
            scene.remove(intersects[0].object);
            scene.add(group);
            SELECTED = group;

            if (raycaster.ray.intersectPlane(plane, intersection)) {
                offset.copy(intersection).sub(SELECTED.position);
            }

            container.style.cursor = 'move';
        } // if
    } // if
    else {
        intersects = raycaster.intersectObjects(group.children);

        if (intersects.length > 0) {
            controls.enabled = false;

            SELECTED = intersects[0].object;

            if (SELECTED.parent != null) {
                SELECTED = SELECTED.parent; // parent should be group since nothing is nested
            }

            if (raycaster.ray.intersectPlane(plane, intersection)) {
                offset.copy(intersection).sub(SELECTED.position);
            }

            container.style.cursor = 'move';
        } // if
    } // if/else
} // function onDocumentMouseDown()

function onDocumentMouseMove( event ) {

    event.preventDefault();

    plane.normal = getCameraNormal();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );
/*
    if (SELECTED) {
        if (raycaster.ray.intersectPlane(plane, intersection)) {
            SELECTED.position.copy(intersection.sub(offset));
        }
    }
  */
    if ( SELECTED ) {

        if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
            SELECTED.position.copy( intersection.sub( offset ) );
        }

        return;

    }

    var intersects = raycaster.intersectObjects( clickableObjects );

    if ( intersects.length > 0 ) {
        if ( INTERSECTED != intersects[ 0 ].object ) {

            INTERSECTED = intersects[ 0 ].object;

            plane.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection( plane.normal ),
                INTERSECTED.position );

        }

        container.style.cursor = 'pointer';

    } else {

        INTERSECTED = null;

        container.style.cursor = 'auto';

    }

}

function onDocumentMouseUp( event ) {

    event.preventDefault();

    controls.enabled = true;

    if ( INTERSECTED ) {
        SELECTED = null;
    }

    container.style.cursor = 'auto';

}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function assignUVs(geometry) {

    geometry.faceVertexUvs[0] = [];

    geometry.faces.forEach(function(face) {

        var components = ['x', 'y', 'z'].sort(function(a, b) {
            return Math.abs(face.normal[a]) > Math.abs(face.normal[b]);
        });

        var v1 = geometry.vertices[face.a];
        var v2 = geometry.vertices[face.b];
        var v3 = geometry.vertices[face.c];

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2(v1[components[0]], v1[components[1]]),
            new THREE.Vector2(v2[components[0]], v2[components[1]]),
            new THREE.Vector2(v3[components[0]], v3[components[1]])
        ]);

    });

    geometry.uvsNeedUpdate = true;
}
function sceneSetup() {
    renderer = new THREE.WebGLRenderer( { antialias:true} );
    renderer.setClearColor( 0xf0f0f0 );

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.sortObjects = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

  //  renderer.setClearColor(0x000033,0);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 500);


    scene = new THREE.Scene({reportSize: 2, fixedTimeStep:1/60});

    scene.add( new THREE.AmbientLight( 0x505050 ) );

    var light = new THREE.SpotLight( 0xffffff, 1 );
    light.position.set( 0, 500, 500 );
    light.castShadow = true;

    light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 50, 1, 200, 10000 ) );
    light.shadow.bias = - 0.00022;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    scene.add( light );

    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = true;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.target = scene.position;

    scene.add(camera);
    camera.lookAt(scene.position);
    scene.background = new THREE.Color(0);
    texture = new THREE.TextureLoader().load("mogball.png");
    texture.repeat.set(0.1, 0.1);
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;

    var loader = new THREE.FontLoader();
    loader.load('Mystery_Quest.json', function (font) {
/*
        var material = new THREE.MeshPhongMaterial({
            color: 0x9421CE
        });
*/
        /*
        var material = new THREE.MeshPhongMaterial( {
            color: 0x2194CE,
            emissive:0x000000,
            specular:0x111111,

            shininess: 30,
            shading: THREE.SmoothShading
        });
        */
        /*
        var textGeom = new THREE.TextGeometry('COUNTDOWN', {
            font: font
        });

        textMesh = new THREE.Mesh(textGeom, material);
        textMesh.castShadow = true;
        textMesh.receiveShadow = true;
        textGeom.computeBoundingBox();
        textGeom.textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;
        textGeom.textHeight = textGeom.boundingBox.max.y - textGeom.boundingBox.min.y;
        textGeom.textLength = textGeom.boundingBox.max.z - textGeom.boundingBox.min.z;
        assignUVs(textGeom);
        textMesh.geometry.translate(-(textGeom.textWidth / 2), -(textGeom.textHeight / 2), -(textGeom.textLength / 2));
        textMesh.scale.set(0.5, 0.5, 0.25);
        textMesh.position.set(0, 0, 100);
        scene.add(textMesh);
        */

        for (var i=0; i<10; i++)
        {
            var letter = POSSIBLE_LETTERS.charAt(Math.floor(Math.random() * POSSIBLE_LETTERS.length));
            textMesh = createGlyph(font, letter);
            textMesh.position.set(Math.cos(i*Math.PI*2/10)*200, Math.sin(i*Math.PI*2/10)*200, 100);

            scene.add(textMesh);
            clickableObjects.push(textMesh);
            collidableObjects.push(textMesh);
        }
    });

}
function createGlyph(font, letter) {
    var material = new THREE.MeshPhongMaterial({
        color: 0xFFCAC0
    });

    var textGeom = new THREE.TextGeometry(letter, {
        font:font
    });

    textMesh = new THREE.Mesh(textGeom, material);
    textMesh.castShadow = true;
    textMesh.receiveShadow = true;
    textGeom.computeBoundingBox();
    textGeom.textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;
    textGeom.textHeight = textGeom.boundingBox.max.y - textGeom.boundingBox.min.y;
    textGeom.textLength = textGeom.boundingBox.max.z - textGeom.boundingBox.min.z;
    assignUVs(textGeom);
    textMesh.geometry.translate(-(textGeom.textWidth / 2), -(textGeom.textHeight / 2), -(textGeom.textLength / 2));
    textMesh.scale.set(0.5, 0.5, 0.25);
    return textMesh;

}
function initialDraw() {
 //   scene.add(new THREE.AxisHelper(500));
    var map = new THREE.TextureLoader().load("Countdown.png");

    var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000, 1000),
        new THREE.MeshPhongMaterial({
            side:THREE.DoubleSide,
            map:map
        }));
    floor.receiveShadow = true;
    scene.add(floor);

} // function initialDraw()

function testCollisions() {
    // since there are multiple things in the group, go through each one with a for loop
    for (var groupIdx = 0; groupIdx < group.children.length; groupIdx++) {

        var currObj = group.children[groupIdx];
        var originPoint = group.position.clone();
        originPoint = originPoint.add(currObj.position);
        // for each vertex of the object
        for (var vertexIndex = 0; vertexIndex < currObj.geometry.vertices.length; vertexIndex++) {
            // Find the vector to shoot out in the current vertex's direction
            var localVertex = currObj.geometry.vertices[vertexIndex].clone();
            var globalVertex = localVertex.applyMatrix4(currObj.matrix);
            var directionVector = globalVertex.sub(currObj.position);
            // ^-- all  this is making sure we account for rotation of obj

            // shoot out the ray on that vector from the center of the object.
            var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
            for (var i = collidableObjects.length - 1; i >= 0; i--) {
                var collisionResults = ray.intersectObject(collidableObjects[i]);
                if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
                    var collidedWith = collidableObjects[i]; // store hit object
                    collidableObjects.splice(i, 1); // remove object from array
                    collidedWith.position = collidedWith.position.sub(group.position);
                    group.add(collidedWith);
                    console.log("hit");
                } // if
            } // for i
        } // for vertexIndex
    } // for groupIdx
} // function testCollisions()

function animate() {
    controls.update();
  //  testCollisions();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

THREE.Utils = {
    cameraLookDir: function(camera) {
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyEuler(camera.rotation, camera.rotation.order);
        return vector;
    }
};