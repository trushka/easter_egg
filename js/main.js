import * as THREE from 'three';
import {vec3, vec2, PI} from './threeCustom.js';

export {vec3, vec2, PI, THREE};

export let scene, geometry, material={}, egg;
export const
	canvSize = vec2(1024, 1024),
	container=document.querySelector('.workspace'),
	canvas = container.querySelector('canvas'),
	cashed={dpr: 1},

	renderer = new THREE.WebGLRenderer( {alpha:true, antialias: true, canvas:canvas} ),
	camera=new THREE.PerspectiveCamera( 40, 1, .1, 100 ),
	raycaster = new THREE.Raycaster();

//renderer.outputColorSpace='srgb-linear';
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
	egg.xvz = [];
	geometry.attributes.position.forEach((pos, i)=>{
		egg.xvz[i] = pos.clone().setY(0).normalize()
		.setY(geometry.attributes.uv.getY(i))
	}, false);
	eggForm();
	//egg.lastPointer=vec2();
	material.onBeforeCompile = sh=>{
		console.log(sh);
		//sh.map=true;
		sh.defines={USE_UV: ''};

		sh.vertexShader = 'varying vec2 vXz;\n' + sh.vertexShader
		.replace('}', 'vXz = position.xz;}');

		sh.fragmentShader = 'varying vec2 vXz;\n' + sh.fragmentShader
		.replace('#include <map_fragment>', 'float UVx = atan( vXz.x, vXz.y ) / PI2;\n' +
		THREE.ShaderChunk.map_fragment.replace('vMapUv', 'vec2(fwidth(UVx)>.5 ? fract(UVx) : UVx, vMapUv.y)')
		)
		.replace('#include <lights_pars_begin>',
		//THREE.ShaderChunk.lights_pars_begin.replace(/(irradiance)(?!.+?irradiance)/s, '$1*$1')
		THREE.ShaderChunk.lights_pars_begin.replace('0.5 * dotNL + 0.5', 'smoothstep(-1., 1., dotNL)')
		)
		.replace('#include <lights_phong_pars_fragment>',
		THREE.ShaderChunk.lights_phong_pars_fragment.replace('dotNL *', '(exp(dotNL*1.3)-1.)/2. *')
		);
	};
	material.map = canvTex;
})
export const canv0 = document.createElement('canvas'),
	ctx=canv0.getContext('2d'),
	img0 = new THREE.ImageLoader().load('./uv.jpg', img=>{
		ctx.drawImage(img, 0, 0);
		canvTex.needsUpdate = true;
	});
	[canv0.width, canv0.height]=canvSize.toArray();

	const canvTex = Object.assign(new THREE.CanvasTexture(canv0), {
		wrapS: THREE.RepeatWrapping,
		anisotropy: renderer.capabilities.getMaxAnisotropy(),
		colorSpace: 'srgb'
	});


export const controls=document.querySelector('.controls');
controls.oninput=controls.onreset=eggForm

let dl, bulge;
export const eggoid = new THREE.Curve();

eggoid.getPoint = function(t, targ=vec2()){
	const angle = t*PI;
	targ.y = -Math.cos(angle);
	targ.x = Math.sin(angle) * Math.lerp(1+.45*bulge, 1-(.62-dl*.16)*bulge, t**.9)//arg.y/2+.5);
	targ.y *= dl;
	return targ;
}
eggoid.getU = function(t){
	const lengths=this.getLengths(),
		length = this.getLength(),
		i = Math.floor(t*=lengths.length);;

	return Math.lerp(lengths[i], lengths[i+1]||length, t-i)/length
}
function eggForm(e){
	if (!e?.target.name || /elongation|bulge/.test(e.target?.name)) {
		dl=controls.elongation.value;
		bulge = egg.bulge = Math.pow(controls.bulge.value, .8)*Math.pow((dl-1), .35);

		const xy = vec2(),
			{uv, position} = geometry.attributes;

		eggoid.needsUpdate=true;
		uv.needsUpdate = true;

		position.forEach((pos, i)=>{
			pos.copy(egg.xvz[i]);
			eggoid.getPoint(1 - (1-pos.y)**(1+bulge*(dl-1)*.2), xy);

			uv.setXY(i, xy.x, eggoid.getU(pos.y));

			pos.x *= xy.x;
			pos.y = xy.y
			pos.z *= xy.x;
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
	const {width, height} = canvas.getBoundingClientRect()
	if (cashed.w!=width || cashed.h!=height) {
		scale = 4/height;
		renderer.setSize(cashed.w=width, cashed.h=height, false);
		camera.aspect=width/height;
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
	if (!canvas.hasPointerCapture(e.pointerId)) return;
	const xy = getXY(e);
	const dPos = pos.copy(e).sub(lastPos).multiplyScalar(scale);
	lastPos.copy(e);
	egg.rotation.y += dPos.x;
	egg.rotation.x += dPos.y;
	egg.rotation.x = Math.clamp(egg.rotation.x, -2, PI/2);
});
window.addEventListener('mousemup', e=>{delete egg.lastPointer});

function getXY(e) {
	const rect = canvas.getBoundingClientRect();
	return vec2(
		((e.pageX - rect.left) / rect.width) * 2 - 1,
		-((e.pageY - rect.top) / rect.height) * 2 + 1
	);
}
