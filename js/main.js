import './three.min.js';
import {vec3, PI} from './threeCustom.js'; export {vec3, PI}

export let scene, geometry, material, egg;
export const 
	container=document.querySelector('.workspace'),
	canvas = container.querySelector('canvas'),
	cashed={dpr: 1},

	renderer = new THREE.WebGLRenderer( {alpha:true, antialias: true, canvas:canvas} ),
	camera=new THREE.PerspectiveCamera( 40, 1, .1, 100 );

camera.position.set(0,2,6);
camera.lookAt(0,0,0);

new THREE.ObjectLoader().load('scene.json', sc=>{
	scene=sc;
	egg=scene.getObjectByName('egg');
	egg.geometry.mergeVertices();
	egg.pos0=new Float32Array(egg.geometry.attributes.position.array);
	eggForm({target: controls.bulge});
})
export const controls=document.querySelector('.controls');
controls.oninput=eggForm
function eggForm(e){
	if (/elongation|bulge/.test(e.target?.name)) {
		let dl=controls.elongation.value,
		 bulge=Math.pow(controls.bulge.value, .8)*Math.pow((dl-1), .4)//*.8;
		egg.geometry.attributes.position.copyArray(egg.pos0)
		.forEach((v, i)=>{
			const y=Math.pow(1-v.y*bulge, .3);
			v.y*=dl;
			v.x*=y;
			v.z*=y;
		})
		egg.geometry.computeVertexNormalsFine()
	}
}

controls.wireframe.oninput=function(e){
	egg.material.wireframe=this.checked;
}

renderer.setAnimationLoop(function(){
	if (!scene) return;
	if (cashed.dpr!=devicePixelRatio) renderer.setPixelRatio(cashed.dpr=devicePixelRatio);
	const rect = canvas.getBoundingClientRect()
	if (cashed.w!=rect.width || cashed.h!=rect.height) {
		renderer.setSize(cashed.w=rect.width, cashed.h=rect.height, false);
		camera.aspect=rect.width/rect.height;
		camera.updateProjectionMatrix();
	}
	renderer.render(scene, camera)
})