import * as THREE from 'three';
import {vec2, vec3, vec4, PI} from './threeCustom.js';

export {vec3, vec2, PI, THREE};

export let scene, geometry, material={}, egg;
export const
	canvSize = [1600, 1600],
	[cWidth, cHeight] = canvSize,
	cRect = [0, 0, ...canvSize],
	cW2 = cWidth / 2,
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
export const canv0 = createCanvas(...canvSize),
	canv1 = createCanvas(8, 8),
	ctx=canv0.getContext('2d', { alpha: false, willReadFrequently: true, desynchronized: true }),
	ctx1=canv1.getContext('2d'),
	img0 = new THREE.ImageLoader().load('./uv.jpg', img=>{
		ctx.drawImage(img, ...cRect);
		canvTex.needsUpdate = true;
		lastImgData = ctx.getImageData(...cRect)
	}),
	canvTex = Object.assign(new THREE.CanvasTexture(canv0), {
		wrapS: THREE.RepeatWrapping,
		anisotropy: renderer.capabilities.getMaxAnisotropy(),
		colorSpace: 'srgb'
	});

function createCanvas(width, height) {
	return Object.assign(document.createElement('canvas'), {width, height});
}

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
		total = this.getLength(),
		{length} = lengths,
		i = Math.min(Math.floor(t*=length), length - 1);

	return Math.lerp(lengths[i], lengths[i+1]||total, t-i)/total
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

let lastXY, lastPos = vec2(), pos = vec2(), scale=1,
	lastImgData, pImgData, curPath = [];
canvas.addEventListener('pointerdown', e=>{
	if (egg.lastPointer) return;
	lastXY = getXY(e);
	lastPos.copy(e);

	canvas.setPointerCapture(e.pointerId)
	if (e.button<2) egg.lastPointer = e.pointerId+'';
	if (!e.button) drawTo(lastXY, true);
});
canvas.addEventListener('pointermove', e=>{
	if (egg?.lastPointer != e.pointerId) return;
	const xy = getXY(e);
	if (curPath[0]) return drawTo(xy);
	const dPos = pos.copy(e).sub(lastPos).multiplyScalar(scale/camera.zoom);
	lastPos.copy(e);
	egg.rotation.y += dPos.x;
	egg.rotation.x += dPos.y;
	egg.rotation.x = Math.clamp(egg.rotation.x, -2, PI/2);
});
canvas.addEventListener('lostpointercapture', e=>{
	delete egg.lastPointer;
	if (curPath[0]) lastImgData = ctx.getImageData(...cRect)
	curPath = [];
});
canvas.addEventListener('wheel', e=>{
	const fract=e.deltaY/120;
	if (curPath[0]) {
		controls.lSize.value *= 1 -fract*.1
	} else {
		camera.zoom *= 1-fract*.02;
		camera.updateProjectionMatrix()
	}
	return false;
})

ctx.moveTo(4, 0)
ctx1.arc(4, 4, 4, -PI, PI);
ctx1.fillStyle = '#032b'
ctx1.fill()
pImgData = ctx1.getImageData(0,0,8,8)

function drawTo(coords, start) {
	raycaster.setFromCamera(coords, camera);
	const {point, uv} = raycaster.intersectObject(egg)[0] || {},
		r=controls.lSize.value, ry=r*2/dl,
		last = curPath.at(-1),
		points=[], xy=vec3();
	if (!uv || !lastImgData) return;
	egg.worldToLocal(point);
	xy.x = (Math.atan2(point.x, point.z)/PI/2+1) % 1 * cWidth;
	xy.y = (1 - uv.y) * cHeight;
	xy.z = r/uv.x;
	if (last) {
		if (Math.abs(last.x-xy.x)>cW2) xy.x += xy.x>cW2 ? -cWidth : cWidth;

		const dist = vec2().copy(xy).sub(last);
		dist.x *= (xy.z+last.z)/2/r;
		let n = Math.ceil(dist.length() / r)+1;
		for (let i=1; i<n; i++){
			const p1 = last.clone().lerp(xy, i/n)
			p1.x+=cWidth;
			p1.x %= cWidth;
			points.push(p1);
		}

	} else points.push(xy);
	curPath.push(...points);

	if (start) {
		ctx.fillStyle = '#021c';
		ctx.beginPath();
	}
	ctx.clearRect(...cRect)
	ctx.putImageData(lastImgData, 0, 0);
	points.forEach(p=>{
		draw(p, ry)
		if (p.x<10 || p.x>cWidth-10) {
			p = p.clone();
			p.x += p.x<10 ? cWidth : -cWidth;
			draw(p, ry);
		}
	})
	ctx.fill();
	canvTex.needsUpdate = true;
}
function draw({x,y,z: rx}, ry) {
	ctx.moveTo(x+rx, y);
	ctx.ellipse(x, y, rx, ry, 0 ,0 ,PI*2);
}

function getXY(e) {
	const rect = canvas.getBoundingClientRect();
	return vec2(
		((e.pageX - rect.left) / rect.width) * 2 - 1,
		-((e.pageY - rect.top) / rect.height) * 2 + 1
	);
}
