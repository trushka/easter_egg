import './three.min.js';
import {vec3, vec2, PI} from './threeCustom.js';

export {vec3, vec2, PI};

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
	({geometry, material}=egg);

	geometry.attributes.uv.array.forEach((val, i, uv)=>{
		if (!(i%2)) uv[i] = 0;
	})
	//console.log(geometry.attributes.uv.array)

	geometry.mergeVertices();
	egg.pos0=new Float32Array(egg.geometry.attributes.position.array);
	eggForm({target: controls.bulge});
	//egg.lastPointer=vec2();
	material.onBeforeCompile = sh=>{
		console.log(sh);
		//sh.map=true;
		sh.defines={USE_UV: ''};

		sh.vertexShader = 'varying vec2 vXz;\n' + sh.vertexShader
		.replace('}', 'vXz = position.xz;}');

		sh.fragmentShader = 'varying vec2 vXz;\n' + sh.fragmentShader
		.replace('#include <map_fragment>', 'float UVx = atan( vXz.x, vXz.y ) / PI2;\n' +
		 THREE.ShaderChunk.map_fragment.replace('vUv', 'vec2(fwidth(UVx)>.5 ? fract(UVx) : UVx, vUv.y)')
		);
	}
	Object.assign(material.map = new THREE.TextureLoader().load('./uv.jpg'), {
		wrapS: THREE.RepeatWrapping,
		anisotropy: renderer.capabilities.getMaxAnisotropy()
	});
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

let lastXY, lastPos = vec2(), pos = vec2(), scale=1;
canvas.addEventListener('pointerdown', e=>{
	lastXY=getXY(e);
	lastPos.copy(e);

	canvas.setPointerCapture(e.pointerId)
});
canvas.addEventListener('pointermove', e=>{
	if (!e.buttons) return;
	const xy = getXY(e);
	const dPos = pos.copy(e).sub(lastPos).multiplyScalar(.01);
	lastPos.copy(e);
	egg.rotation.y += dPos.x;
	egg.rotation.x += dPos.y;
	egg.rotation.x = Math.clamp(egg.rotation.x, -PI/2, PI/2);
});
window.addEventListener('mousemup', e=>{delete egg.lastPointer});

function getXY(e) {
	const rect = canvas.getBoundingClientRect();
	return vec2(
		((e.pageX - rect.left) / rect.width) * 2 - 1,
		-((e.pageY - rect.top) / rect.height) * 2 + 1
	);
}